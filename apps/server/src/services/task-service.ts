import type {
  CoverCreateInput,
  LibrarySnapshot,
  NovelCreateInput,
  QuickCreateInput,
  Song,
  SongTask,
  SunoGenerationOptions
} from "@ai-music/types";

import { updateSnapshot } from "../lib/file-db.js";
import { makeId, now, svgCoverDataUrl } from "../lib/utils.js";
import type { SunoClient, SunoTaskDetails } from "../providers/suno-client.js";
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
  makeInstrumental: boolean;
  model: SunoGenerationOptions["model"];
  negativeTags?: string;
  vocalGender?: SunoGenerationOptions["vocalGender"];
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
    makeInstrumental: input.makeInstrumental,
    model: input.model,
    negativeTags: input.negativeTags?.trim() ?? "",
    vocalGender: input.vocalGender ?? "",
    lyricsSnippet: "",
    tags: input.stylePrompt
      .split(/[、,]/)
      .map((item) => item.trim())
      .filter(Boolean),
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

function createSiblingSongRecord(
  baseSong: Song,
  taskId: string,
  clip: NonNullable<SunoTaskDetails["clips"]>[number],
  fallbackIndex: number
) {
  const timestamp = now();
  const clipTitle = clip.title?.trim() || `${baseSong.title} · 版本 ${fallbackIndex + 1}`;

  return {
    ...baseSong,
    id: makeId("song"),
    title: clipTitle,
    status: "ready",
    taskId,
    providerJobId: clip.clipId,
    lyricsSnippet: clip.lyricsSnippet,
    audioUrl: clip.audioUrl,
    coverUrl: clip.coverUrl ?? baseSong.coverUrl,
    durationSeconds: clip.durationSeconds,
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
      mode: "quick",
      makeInstrumental: input.makeInstrumental,
      model: input.model,
      negativeTags: input.negativeTags,
      vocalGender: input.vocalGender
    });
    const task = createTaskRecord(song);
    song.taskId = task.id;

    await updateSnapshot((snapshot) => ({
      ...snapshot,
      songs: [song, ...snapshot.songs],
      tasks: [task, ...snapshot.tasks]
    }));

    await this.submitSong(task.id, song.id, this.sunoClient.buildQuickPayload(input));

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
      makeInstrumental: input.makeInstrumental,
      model: input.model,
      negativeTags: input.negativeTags,
      vocalGender: input.vocalGender,
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

    await this.submitSong(task.id, song.id, {
      title: song.title,
      prompt: song.prompt,
      stylePrompt: song.stylePrompt,
      mode: song.mode,
      makeInstrumental: input.makeInstrumental,
      model: input.model,
      negativeTags: input.negativeTags,
      vocalGender: input.vocalGender
    });

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
    if (details.status !== "failed" && details.errorMessage && ageMs(task.createdAt) >= EMPTY_DETAILS_TIMEOUT_MS) {
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

    await updateSnapshot((current) => {
      const relatedSongs = current.songs.filter((entry) => entry.taskId === song.taskId);
      const currentTask = current.tasks.find((entry) => entry.id === song.taskId);
      const remainingSongs = current.songs.filter((entry) => entry.id !== songId);

      if (!currentTask) {
        return {
          ...current,
          songs: remainingSongs
        };
      }

      if (relatedSongs.length <= 1) {
        return {
          ...current,
          songs: remainingSongs,
          tasks: current.tasks.filter((entry) => entry.id !== currentTask.id)
        };
      }

      if (currentTask.songId !== songId) {
        return {
          ...current,
          songs: remainingSongs
        };
      }

      const replacementSong = relatedSongs.find((entry) => entry.id !== songId);

      return {
        ...current,
        songs: remainingSongs,
        tasks: current.tasks.map((entry) =>
          entry.id === currentTask.id && replacementSong
            ? {
                ...entry,
                songId: replacementSong.id,
                title: replacementSong.title,
                prompt: replacementSong.prompt,
                updatedAt: now()
              }
            : entry
        )
      };
    });

    return {
      deleted: true,
      songId
    };
  }

  async deleteFailedTask(taskId: string) {
    const snapshot = await this.getSnapshot();
    const task = snapshot.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status !== "failed") {
      throw new Error("Only failed tasks can be deleted");
    }

    await updateSnapshot((current) => ({
      ...current,
      tasks: current.tasks.filter((entry) => entry.id !== taskId),
      songs: current.songs.filter((entry) => entry.id !== task.songId)
    }));

    return {
      deleted: true,
      taskId
    };
  }

  async retryTask(taskId: string) {
    const snapshot = await this.getSnapshot();
    const task = snapshot.tasks.find((entry) => entry.id === taskId);
    const sourceSong = snapshot.songs.find((entry) => entry.id === task?.songId);

    if (!task || !sourceSong) {
      throw new Error("Task not found");
    }

    if (task.status !== "failed") {
      throw new Error("Only failed tasks can be retried");
    }

    const song = createSongRecord({
      title: sourceSong.title,
      prompt: sourceSong.prompt,
      stylePrompt: sourceSong.stylePrompt,
      mode: sourceSong.mode,
      makeInstrumental: sourceSong.makeInstrumental,
      model: sourceSong.model,
      negativeTags: sourceSong.negativeTags,
      vocalGender: sourceSong.vocalGender,
      sourceDocumentId: sourceSong.sourceDocumentId,
      sourceExcerpt: sourceSong.sourceExcerpt
    });
    const nextTask = createTaskRecord(song);
    song.taskId = nextTask.id;

    await updateSnapshot((current) => ({
      ...current,
      songs: [song, ...current.songs],
      tasks: [nextTask, ...current.tasks]
    }));

    await this.submitSong(nextTask.id, song.id, {
      title: song.title,
      prompt: song.prompt,
      stylePrompt: song.stylePrompt,
      mode: song.mode,
      makeInstrumental: song.makeInstrumental,
      model: song.model,
      negativeTags: song.negativeTags,
      vocalGender: song.vocalGender
    });

    return this.getSongSnapshot(song.id);
  }

  async reconcileStaleTasks() {
    const snapshot = await this.getSnapshot();
    const staleTasks = snapshot.tasks.filter(
      (task) =>
        ((task.status === "queued" || task.status === "running") &&
          Boolean(task.providerTaskId) &&
          ageMs(task.updatedAt) >= EMPTY_DETAILS_TIMEOUT_MS) ||
        (task.status === "succeeded" &&
          Boolean(task.providerTaskId) &&
          snapshot.songs.filter((song) => song.taskId === task.id).length < 2)
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
      clips: [],
      raw: payload
    });
  }

  private async finishSong(taskId: string) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await this.refreshTask(taskId);
  }

  private async submitSong(taskId: string, songId: string, payload: Parameters<SunoClient["createMusic"]>[0]) {
    try {
      const providerTask = await this.sunoClient.createMusic(payload);

      await this.patchTask(taskId, (current) => ({
        ...current,
        providerTaskId: providerTask.providerTaskId,
        status: "running",
        progressLabel: "Suno 已接受任务，等待生成",
        updatedAt: now()
      }));
      await this.patchSong(songId, (current) => ({
        ...current,
        providerJobId: providerTask.providerTaskId,
        updatedAt: now()
      }));

      void this.finishSong(taskId);
    } catch (error) {
      await this.failTask(taskId, songId, error);
    }
  }

  private async applyTaskDetails(
    taskId: string,
    details: {
      status: "queued" | "running" | "succeeded" | "failed";
      audioUrl: string | null;
      lyricsSnippet: string;
      durationSeconds: number | null;
      errorMessage?: string | null;
      clips?: SunoTaskDetails["clips"];
    }
  ) {
    const snapshot = await this.getSnapshot();
    const task = snapshot.tasks.find((entry) => entry.id === taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    const clipItems =
      details.clips && details.clips.length > 0
        ? details.clips
        : [
            {
              clipId: task.providerTaskId ?? `${taskId}:clip-1`,
              title: task.title,
              audioUrl: details.audioUrl,
              coverUrl: null,
              lyricsSnippet: details.lyricsSnippet,
              durationSeconds: details.durationSeconds,
              raw: null
            }
          ];
    const primaryClip = clipItems[0];

    await updateSnapshot((current) => {
      const currentTask = current.tasks.find((entry) => entry.id === taskId);
      if (!currentTask) {
        return current;
      }

      const currentSongs = current.songs.filter((entry) => entry.taskId === taskId);
      const primarySong =
        current.songs.find((entry) => entry.id === currentTask.songId) ?? currentSongs[0];

      if (!primarySong) {
        return current;
      }

      const timestamp = now();
      const nextTasks = current.tasks.map((entry) =>
        entry.id === taskId
          ? {
              ...entry,
              title: primaryClip?.title?.trim() || entry.title,
              status: details.status,
              progressLabel:
                details.status === "succeeded"
                  ? "歌曲已生成"
                  : details.status === "failed"
                    ? "歌曲生成失败"
                    : "Suno 处理中",
              errorMessage:
                details.status === "failed"
                  ? details.errorMessage ?? "Provider generation failed"
                  : null,
              updatedAt: timestamp
            }
          : entry
      );

      const nextSongs = current.songs.map((entry) => {
        if (entry.id !== primarySong.id) {
          return entry;
        }

        return {
          ...entry,
          title: primaryClip?.title?.trim() || entry.title,
          status:
            details.status === "succeeded"
              ? "ready"
              : details.status === "failed"
                ? "failed"
                : "generating",
          providerJobId: primaryClip?.clipId || entry.providerJobId,
          audioUrl: primaryClip?.audioUrl ?? details.audioUrl,
          coverUrl: primaryClip?.coverUrl ?? entry.coverUrl,
          lyricsSnippet: primaryClip?.lyricsSnippet ?? details.lyricsSnippet,
          durationSeconds: primaryClip?.durationSeconds ?? details.durationSeconds,
          updatedAt: timestamp
        };
      });

      if (details.status !== "succeeded" || clipItems.length <= 1) {
        return {
          ...current,
          tasks: nextTasks,
          songs: nextSongs
        };
      }

      const songsWithVariants = [...nextSongs];

      for (let index = 1; index < clipItems.length; index += 1) {
        const clip = clipItems[index];
        const clipKey = clip.clipId || `${currentTask.providerTaskId ?? taskId}:clip-${index + 1}`;
        const existingSongIndex = songsWithVariants.findIndex(
          (entry) => entry.taskId === taskId && entry.id !== primarySong.id && entry.providerJobId === clipKey
        );

        if (existingSongIndex >= 0) {
          const existingSong = songsWithVariants[existingSongIndex];
          songsWithVariants[existingSongIndex] = {
            ...existingSong,
            title: clip.title?.trim() || existingSong.title,
            status: "ready",
            providerJobId: clipKey,
            audioUrl: clip.audioUrl,
            coverUrl: clip.coverUrl ?? existingSong.coverUrl,
            lyricsSnippet: clip.lyricsSnippet,
            durationSeconds: clip.durationSeconds,
            updatedAt: timestamp
          };
          continue;
        }

        songsWithVariants.push(
          createSiblingSongRecord(
            {
              ...primarySong,
              title: primaryClip?.title?.trim() || primarySong.title,
              providerJobId: primaryClip?.clipId || primarySong.providerJobId,
              audioUrl: primaryClip?.audioUrl ?? details.audioUrl,
              coverUrl: primaryClip?.coverUrl ?? primarySong.coverUrl,
              lyricsSnippet: primaryClip?.lyricsSnippet ?? details.lyricsSnippet,
              durationSeconds: primaryClip?.durationSeconds ?? details.durationSeconds,
              status: "ready",
              updatedAt: timestamp
            },
            taskId,
            {
              ...clip,
              clipId: clipKey
            },
            index
          )
        );
      }

      return {
        ...current,
        tasks: nextTasks,
        songs: songsWithVariants
      };
    });

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
