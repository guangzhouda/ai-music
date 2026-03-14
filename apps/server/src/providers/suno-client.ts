import { genreRules } from "@ai-music/config";
import type { GenerationMode, QuickCreateInput, SunoGenerationOptions } from "@ai-music/types";

import type { Env } from "../config/env.js";
import { makeId } from "../lib/utils.js";

export interface SunoCreatePayload {
  title: string;
  prompt: string;
  stylePrompt: string;
  mode: GenerationMode;
  makeInstrumental: boolean;
  model: SunoGenerationOptions["model"];
  negativeTags?: string;
  vocalGender?: SunoGenerationOptions["vocalGender"];
}

export interface SunoCreateResult {
  providerTaskId: string;
  raw: unknown;
}

export interface SunoTaskDetails {
  status: "queued" | "running" | "succeeded" | "failed";
  audioUrl: string | null;
  lyricsSnippet: string;
  durationSeconds: number | null;
  errorMessage: string | null;
  clips: Array<{
    clipId: string;
    title: string | null;
    audioUrl: string | null;
    coverUrl: string | null;
    lyricsSnippet: string;
    durationSeconds: number | null;
    raw: unknown;
  }>;
  raw: unknown;
}

export class SunoClient {
  constructor(private readonly config: Env) {}

  private get callbackUrl() {
    return this.config.sunoCallbackUrl.trim() || `http://localhost:${this.config.port}/api/providers/suno/callback`;
  }

  private async fetchWithRetry(url: string | URL, init: RequestInit, attempts = 2) {
    let lastError: unknown;

    for (let index = 0; index < attempts; index += 1) {
      try {
        return await fetch(url, init);
      } catch (error) {
        lastError = error;
        if (index < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
      }
    }

    throw lastError;
  }

  private resolveStyleText(stylePrompt: string) {
    const styleRule =
      genreRules.find((rule) => rule.slug === stylePrompt) ??
      genreRules.find((rule) => rule.name === stylePrompt);

    if (!styleRule) {
      return stylePrompt;
    }

    return `${styleRule.name}，节奏 ${styleRule.bpmRange}，重点配器：${styleRule.instruments.join("、")}，编曲说明：${styleRule.arrangementNotes.join("；")}`;
  }

  get runtimeMode() {
    return this.config.mockMode || !this.config.sunoApiKey ? "mock" : "live";
  }

  get callbackConfigured() {
    return Boolean(this.config.sunoCallbackUrl.trim());
  }

  async createMusic(payload: SunoCreatePayload): Promise<SunoCreateResult> {
    if (this.runtimeMode === "mock") {
      return {
        providerTaskId: makeId("suno"),
        raw: {
          mode: "mock",
          payload
        }
      };
    }

    const requestBody: Record<string, unknown> = {
      customMode: true,
      instrumental: payload.makeInstrumental,
      model: payload.model,
      prompt: payload.prompt,
      style: payload.stylePrompt,
      title: payload.title
    };

    if (payload.negativeTags?.trim()) {
      requestBody.negativeTags = payload.negativeTags.trim();
    }

    if (payload.vocalGender) {
      requestBody.vocalGender = payload.vocalGender;
    }

    requestBody.callBackUrl = this.callbackUrl;

    const response = await this.fetchWithRetry(`${this.config.sunoBaseUrl}${this.config.sunoGeneratePath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.sunoApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Suno API create failed: ${response.status}`);
    }

    const raw = (await response.json()) as Record<string, unknown>;

    const businessCode = typeof raw.code === "number" ? raw.code : 200;
    if (businessCode !== 200) {
      throw new Error(String(raw.msg ?? raw.message ?? "Suno API create failed"));
    }

    const providerTaskId =
      (typeof raw?.data === "object" && raw?.data !== null && "taskId" in raw.data
        ? String((raw.data as { taskId?: unknown }).taskId ?? "")
        : "") ||
      String(raw.taskId ?? raw.id ?? "");

    if (!providerTaskId) {
      throw new Error("Suno API create failed: missing taskId");
    }

    return {
      providerTaskId,
      raw
    };
  }

  async getTaskDetails(taskId: string, fallbackPrompt: string): Promise<SunoTaskDetails> {
    if (this.runtimeMode === "mock") {
      return {
        status: "succeeded",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        lyricsSnippet: `Mock lyrics for ${fallbackPrompt.slice(0, 80)}`,
        durationSeconds: 132,
        errorMessage: null,
        clips: [
          {
            clipId: `${taskId}:clip-1`,
            title: "Mock Song A",
            audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            coverUrl: null,
            lyricsSnippet: `Mock lyrics for ${fallbackPrompt.slice(0, 80)}`,
            durationSeconds: 132,
            raw: {
              mode: "mock",
              clip: 1
            }
          }
        ],
        raw: {
          mode: "mock",
          taskId
        }
      };
    }

    const url = new URL(`${this.config.sunoBaseUrl}${this.config.sunoDetailsPath}`);
    url.searchParams.set("taskId", taskId);

    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${this.config.sunoApiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Suno API details failed: ${response.status}`);
    }

    const raw = (await response.json()) as Record<string, any>;
    const businessCode = typeof raw.code === "number" ? raw.code : 200;

    if (businessCode !== 200) {
      throw new Error(String(raw.msg ?? raw.message ?? "Suno API details failed"));
    }

    const payload = raw?.data;

    if (payload == null) {
      return {
        status: "queued",
        audioUrl: null,
        lyricsSnippet: fallbackPrompt,
        durationSeconds: null,
        errorMessage: "Provider details returned empty data",
        clips: [],
        raw
      };
    }

    const topLevel = raw?.data;
    const sunoData = Array.isArray(topLevel?.response?.sunoData)
      ? topLevel.response.sunoData
      : Array.isArray(topLevel?.data)
        ? topLevel.data
        : Array.isArray(topLevel)
          ? topLevel
          : [];
    const clips = sunoData.map((entry: Record<string, unknown>, index: number) => ({
      clipId: String(entry?.id ?? entry?.audioId ?? entry?.musicId ?? `${taskId}:clip-${index + 1}`),
      title: typeof entry?.title === "string" && entry.title.trim() ? entry.title.trim() : null,
      audioUrl:
        typeof entry?.audioUrl === "string"
          ? entry.audioUrl
          : typeof entry?.audio_url === "string"
            ? entry.audio_url
            : typeof entry?.streamAudioUrl === "string"
              ? entry.streamAudioUrl
              : typeof entry?.stream_audio_url === "string"
                ? entry.stream_audio_url
                : null,
      coverUrl:
        typeof entry?.imageUrl === "string"
          ? entry.imageUrl
          : typeof entry?.image_url === "string"
            ? entry.image_url
            : null,
      lyricsSnippet:
        typeof entry?.lyric === "string"
          ? entry.lyric
          : typeof entry?.lyrics === "string"
            ? entry.lyrics
            : typeof entry?.prompt === "string"
              ? entry.prompt
              : fallbackPrompt,
      durationSeconds:
        typeof entry?.duration === "number"
          ? entry.duration
          : typeof entry?.durationSeconds === "number"
            ? entry.durationSeconds
            : null,
      raw: entry
    }));
    const clip = clips[0] ?? null;
    const status = String(topLevel?.status ?? clip?.status ?? raw?.status ?? "queued").toUpperCase();

    const succeededStatuses = new Set(["SUCCESS", "COMPLETED"]);
    const runningStatuses = new Set(["RUNNING", "TEXT_SUCCESS", "FIRST_SUCCESS", "PROCESSING", "IN_PROGRESS"]);
    const failedStatuses = new Set([
      "FAILED",
      "CREATE_TASK_FAILED",
      "GENERATE_AUDIO_FAILED",
      "CALLBACK_EXCEPTION",
      "SENSITIVE_WORD_ERROR",
      "ERROR",
      "TIMEOUT",
      "CANCELLED"
    ]);

    return {
      status: succeededStatuses.has(status)
        ? "succeeded"
        : failedStatuses.has(status)
          ? "failed"
          : runningStatuses.has(status)
            ? "running"
            : "queued",
      audioUrl: clip?.audioUrl ?? null,
      lyricsSnippet: clip?.lyricsSnippet ?? fallbackPrompt,
      durationSeconds: clip?.durationSeconds ?? null,
      errorMessage: failedStatuses.has(status)
        ? String(topLevel?.errorMessage ?? topLevel?.response?.errorMessage ?? raw?.msg ?? "Provider generation failed")
        : null,
      clips,
      raw
    };
  }

  async getCredits() {
    if (this.runtimeMode === "mock") {
      return {
        creditsRemaining: 128,
        raw: {
          mode: "mock"
        }
      };
    }

    const response = await this.fetchWithRetry(`${this.config.sunoBaseUrl}${this.config.sunoCreditsPath}`, {
      headers: {
        Authorization: `Bearer ${this.config.sunoApiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Suno API credits failed: ${response.status}`);
    }

    const raw = (await response.json()) as Record<string, any>;
    const businessCode = typeof raw.code === "number" ? raw.code : 200;

    if (businessCode !== 200) {
      throw new Error(String(raw.msg ?? raw.message ?? "Suno API credits failed"));
    }

    const creditsRemaining = Number(
      typeof raw?.data === "number" ? raw.data : raw?.data?.credits ?? raw?.credits ?? 0
    );

    return {
      creditsRemaining,
      raw
    };
  }

  buildQuickPayload(input: QuickCreateInput): SunoCreatePayload {
    return {
      title: input.title,
      prompt: input.prompt,
      stylePrompt: this.resolveStyleText(input.stylePrompt),
      mode: "quick",
      makeInstrumental: input.makeInstrumental,
      model: input.model,
      negativeTags: input.negativeTags,
      vocalGender: input.vocalGender
    };
  }
}
