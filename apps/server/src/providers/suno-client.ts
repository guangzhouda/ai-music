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
  raw: unknown;
}

export class SunoClient {
  constructor(private readonly config: Env) {}

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
    return Boolean(this.config.sunoCallbackUrl);
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

    if (this.config.sunoCallbackUrl) {
      requestBody.callBackUrl = this.config.sunoCallbackUrl;
    }

    const response = await fetch(`${this.config.sunoBaseUrl}${this.config.sunoGeneratePath}`, {
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

    const providerTaskId =
      (typeof raw?.data === "object" && raw?.data !== null && "taskId" in raw.data
        ? String((raw.data as { taskId?: unknown }).taskId ?? "")
        : "") ||
      String(raw.taskId ?? raw.id ?? makeId("suno"));

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
        raw: {
          mode: "mock",
          taskId
        }
      };
    }

    const url = new URL(`${this.config.sunoBaseUrl}${this.config.sunoDetailsPath}`);
    url.searchParams.set("taskId", taskId);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.sunoApiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Suno API details failed: ${response.status}`);
    }

    const raw = (await response.json()) as Record<string, any>;
    const payload = raw?.data;

    if (payload == null) {
      return {
        status: "queued",
        audioUrl: null,
        lyricsSnippet: fallbackPrompt,
        durationSeconds: null,
        errorMessage: "Provider details returned empty data",
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
    const clip = sunoData[0] ?? topLevel?.response?.sunoData?.[0] ?? topLevel;
    const status = String(topLevel?.status ?? clip?.status ?? raw?.status ?? "queued").toUpperCase();

    const succeededStatuses = new Set(["SUCCESS", "COMPLETED"]);
    const runningStatuses = new Set(["RUNNING", "TEXT_SUCCESS", "FIRST_SUCCESS", "PROCESSING", "IN_PROGRESS"]);
    const failedStatuses = new Set(["FAILED", "CREATE_TASK_FAILED", "ERROR", "TIMEOUT", "CANCELLED"]);

    return {
      status: succeededStatuses.has(status)
        ? "succeeded"
        : failedStatuses.has(status)
          ? "failed"
          : runningStatuses.has(status)
            ? "running"
            : "queued",
      audioUrl:
        clip?.audioUrl ??
        clip?.audio_url ??
        clip?.streamAudioUrl ??
        clip?.stream_audio_url ??
        null,
      lyricsSnippet: clip?.lyric ?? clip?.lyrics ?? clip?.prompt ?? fallbackPrompt,
      durationSeconds: clip?.duration ?? clip?.durationSeconds ?? null,
      errorMessage: failedStatuses.has(status) ? String(clip?.errorMessage ?? clip?.error_message ?? raw?.msg ?? "Provider generation failed") : null,
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

    const response = await fetch(`${this.config.sunoBaseUrl}${this.config.sunoCreditsPath}`, {
      headers: {
        Authorization: `Bearer ${this.config.sunoApiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Suno API credits failed: ${response.status}`);
    }

    const raw = (await response.json()) as Record<string, any>;
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
