import type {
  CoverCreateInput,
  LibrarySnapshot,
  NovelCreateInput,
  QuickCreateInput,
  Song,
  SongTask
} from "@ai-music/types";

import { updateSnapshot } from "../lib/file-db.js";
import { makeId, now, svgCoverDataUrl } from "../lib/utils.js";
import type { SunoClient } from "../providers/suno-client.js";
import type { VolcengineCoverClient } from "../providers/volcengine-client.js";
import type { NovelService } from "./novel-service.js";

const EMPTY_DETAILS_TIMEOUT_MS = 5 * 60 * 1000;

function ageMs(timestamp: string) {
  const value = Date.parse(timestamp);
  return Number.isNaN(value) ? 0 : Date.now() - value;
}

function createSongRecord(input: {
  title: string;
  prompt: string;
  stylePrompt: string;
  mode: Song["mode"];
  sourceDocumentId?: string | null;
  sourceExcerpt?: string | null;
}) {
  const timestamp = now();
  return {
    id: makeId("song"),
    title: input.title,
    mode: input.mode,
    status: "generating",
    taskId: "",
    providerJobId: null,
      prompt: input.prompt,
      stylePrompt: input.stylePrompt,
      lyricsSnippet: "",
      tags: input.stylePrompt.split(/[、,]/).map((item) => item.trim()).filter(Boolean),
    audioUrl: null,
    coverUrl: svgCoverDataUrl(input.title),
    coverStatus: "idle",
    durationSeconds: null,
    sourceDocumentId: input.sourceDocumentId ?? null,
    sourceExcerpt: input.sourceExcerpt ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  } satisfies Song;
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown provider error";
  }
}

function createTaskRecord(song: Song) {
  const timestamp = now();
  return {
    id: makeId("task"),
    songId: song.id,
    mode: song.mode,
    status: "queued",
    providerTaskId: null,
    provider: "sunoapi",
    title: song.title,
    prompt: song.prompt,
    errorMessage: null,
    progressLabel: "等待提交 Suno 任务",
    createdAt: timestamp,
    updatedAt: timestamp
  } satisfies SongTask;
}

export class TaskService {
  constructor(
    private readonly sunoClient: SunoClient,
    private readonly coverClient: VolcengineCoverClient,
    private readonly novelService: NovelService
  ) {}

  async createQuickSong(input: QuickCreateInput) {
    const song = createSongRecord({
      title: input.title,
      prompt: input.prompt,
      stylePrompt: input.stylePrompt,
      mode: "quick"
    });
    const task = createTaskRecord(song);
    song.taskId = task.id;

    await updateSnapshot((snapshot) => ({
      ...snapshot,
      songs: [song, ...snapshot.songs],
      tasks: [task, ...snapshot.tasks]
    }));

    try {
      const providerTask = await this.sunoClient.createMusic(this.sunoClient.buildQuickPayload(input));

      await this.patchTask(task.id, (current) => ({
        ...current,
        providerTaskId: providerTask.providerTaskId,
        status: "running",
        progressLabel: "Suno 已接受任务，等待生成",
        updatedAt: now()
      }));
      await this.patchSong(song.id, (current) => ({
        ...current,
        providerJobId: providerTask.providerTaskId,
        updatedAt: now()
      }));

      void this.finishSong(task.id);
    } catch (error) {
      await this.failTask(task.id, song.id, error);
    }

    return this.getSongSnapshot(song.id);
  }

  async createNovelSong(input: NovelCreateInput) {
    const snapshot = await this.getSnapshot();
    const document = snapshot.documents.find((item) => item.id === input.documentId);

    if (!document) {
      throw new Error("Novel document not found");
    }

    const composed = await this.novelService.composeNovelPrompt(document, input);
    const song = createSongRecord({
      title: composed.title,
      prompt: composed.prompt,
      stylePrompt: composed.stylePrompt,
      mode: input.mode,
      sourceDocumentId: document.id,
      sourceExcerpt: input.excerpt ?? null
    });
    const task = createTaskRecord(song);
    song.taskId = task.id;

    await updateSnapshot((current) => ({
      ...current,
      songs: [song, ...current.songs],
      tasks: [task, ...current.tasks]
    }));

    try {
      const providerTask = await this.sunoClient.createMusic({
        title: song.title,
        prompt: song.prompt,
        stylePrompt: song.stylePrompt,
        mode: song.mode,
        makeInstrumental: input.makeInstrumental,
        model: input.model,
        negativeTags: input.negativeTags,
        vocalGender: input.vocalGender
      });

      await this.patchTask(task.id, (current) => ({
        ...current,
        providerTaskId: providerTask.providerTaskId,
        status: "running",
        progressLabel: "小说素材已提交到 Suno",
        updatedAt: now()
      }));
      await this.patchSong(song.id, (current) => ({
        ...current,
        providerJobId: providerTask.providerTaskId,
        updatedAt: now()
      }));

      void this.finishSong(task.id);
    } catch (error) {
      await this.failTask(task.id, song.id, error);
    }

    return this.getSongSnapshot(song.id);
  }

  async createCover(input: CoverCreateInput) {
    const snapshot = await this.getSnapshot();
    const song = snapshot.songs.find((item) => item.id === input.songId);

    if (!song) {
      throw new Error("Song not found");
    }

    await this.patchSong(song.id, (current) => ({
      ...current,
      coverStatus: "generating",
      updatedAt: now()
    }));

    try {
      const cover = await this.coverClient.createCover(input.prompt, song.title);

      await this.patchSong(song.id, (current) => ({
        ...current,
        coverStatus: "ready",
        coverUrl: cover.imageUrl,
        updatedAt: now()
      }));

      return cover;
    } catch (error) {
      await this.patchSong(song.id, (current) => ({
        ...current,
        coverStatus: "failed",
        updatedAt: now()
      }));
      throw error;
    }
  }

  async refreshTask(taskId: string) {
    const snapshot = await this.getSnapshot();
    const task = snapshot.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.providerTaskId) {
      return task;
    }

    const details = await this.sunoClient.getTaskDetails(task.providerTaskId, task.prompt);
    if (details.errorMessage && ageMs(task.createdAt) >= EMPTY_DETAILS_TIMEOUT_MS) {
      return this.applyTaskDetails(task.id, {
        ...details,
        status: "failed",
        errorMessage: "Suno 未返回有效任务详情，任务可能已失效或 provider 查询异常"
      });
    }

    return this.applyTaskDetails(task.id, details);
  }

  async syncCredits() {
    const credits = await this.sunoClient.getCredits();
    const account = await updateSnapshot((snapshot) => ({
      ...snapshot,
      account: {
        ...snapshot.account,
        creditsRemaining: credits.creditsRemaining,
        mode: this.sunoClient.runtimeMode,
        callbackConfigured: this.sunoClient.callbackConfigured,
        lastCheckedAt: now()
      }
    }));

    return account.account;
  }

  async deleteSong(songId: string) {
    const snapshot = await this.getSnapshot();
    const song = snapshot.songs.find((entry) => entry.id === songId);

    if (!song) {
      throw new Error("Song not found");
    }

    await updateSnapshot((current) => ({
      ...current,
      songs: current.songs.filter((entry) => entry.id !== songId),
      tasks: current.tasks.filter((entry) => entry.songId !== songId)
    }));

    return {
      deleted: true,
      songId
    };
  }

  async reconcileStaleTasks() {
    const snapshot = await this.getSnapshot();
    const staleTasks = snapshot.tasks.filter(
      (task) =>
        (task.status === "queued" || task.status === "running") &&
        Boolean(task.providerTaskId) &&
        ageMs(task.updatedAt) >= EMPTY_DETAILS_TIMEOUT_MS
    );

    for (const task of staleTasks) {
      try {
        await this.refreshTask(task.id);
      } catch {
        // Keep the snapshot readable even when one provider query fails.
      }
    }
  }

  async getSnapshot() {
    const { readSnapshot } = await import("../lib/file-db.js");
    return readSnapshot();
  }

  async handleWebhook(payload: Record<string, any>) {
    const providerTaskId = String(payload?.taskId ?? payload?.data?.taskId ?? "");

    if (!providerTaskId) {
      return;
    }

    const snapshot = await this.getSnapshot();
    const task = snapshot.tasks.find((entry) => entry.providerTaskId === providerTaskId);

    if (!task) {
      return;
    }

    const status = String(payload?.status ?? payload?.data?.status ?? "queued").toLowerCase();
    await this.applyTaskDetails(task.id, {
      status:
        status === "success" || status === "completed"
          ? "succeeded"
          : status === "failed"
            ? "failed"
            : "running",
      audioUrl: payload?.audioUrl ?? payload?.data?.audioUrl ?? null,
      lyricsSnippet: payload?.prompt ?? payload?.data?.prompt ?? task.prompt,
      durationSeconds: payload?.duration ?? payload?.data?.duration ?? null,
      raw: payload
    });
  }

  private async finishSong(taskId: string) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await this.refreshTask(taskId);
  }

  private async applyTaskDetails(
    taskId: string,
    details: {
      status: "queued" | "running" | "succeeded" | "failed";
      audioUrl: string | null;
      lyricsSnippet: string;
      durationSeconds: number | null;
      errorMessage?: string | null;
    }
  ) {
    const snapshot = await this.getSnapshot();
    const task = snapshot.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    await this.patchTask(taskId, (current) => ({
      ...current,
      status: details.status,
      progressLabel:
        details.status === "succeeded"
          ? "歌曲已生成"
          : details.status === "failed"
            ? "歌曲生成失败"
            : "Suno 处理中",
      errorMessage: details.status === "failed" ? details.errorMessage ?? "Provider generation failed" : null,
      updatedAt: now()
    }));
    await this.patchSong(task.songId, (current) => ({
      ...current,
      status:
        details.status === "succeeded"
          ? "ready"
          : details.status === "failed"
            ? "failed"
            : "generating",
      audioUrl: details.audioUrl,
      lyricsSnippet: details.lyricsSnippet,
      durationSeconds: details.durationSeconds,
      updatedAt: now()
    }));

    return this.getSongSnapshot(task.songId);
  }

  private async patchSong(songId: string, patcher: (song: Song) => Song) {
    await updateSnapshot((snapshot) => ({
      ...snapshot,
      songs: snapshot.songs.map((song) => (song.id === songId ? patcher(song) : song))
    }));
  }

  private async patchTask(taskId: string, patcher: (task: SongTask) => SongTask) {
    await updateSnapshot((snapshot) => ({
      ...snapshot,
      tasks: snapshot.tasks.map((task) => (task.id === taskId ? patcher(task) : task))
    }));
  }

  private async getSongSnapshot(songId: string) {
    const snapshot = await this.getSnapshot();
    return snapshot.songs.find((song) => song.id === songId);
  }

  private async failTask(taskId: string, songId: string, error: unknown) {
    const message = formatUnknownError(error);

    await this.patchTask(taskId, (current) => ({
      ...current,
      status: "failed",
      errorMessage: message,
      progressLabel: "Provider 调用失败",
      updatedAt: now()
    }));
    await this.patchSong(songId, (current) => ({
      ...current,
      status: "failed",
      updatedAt: now()
    }));
  }
}
