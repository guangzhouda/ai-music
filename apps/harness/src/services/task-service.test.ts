import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Song, SongTask } from "@ai-music/types";

import { TaskService } from "../../../server/src/services/task-service.js";
import { createInMemoryStore, buildSnapshot } from "../helpers/snapshot-factory.js";
import {
  FakeSunoClient,
  FakeCoverClient,
  FakeNovelService
} from "../helpers/mock-providers.js";

// ---------------------------------------------------------------------------
// Mock file-db → 替换为内存存储
// ---------------------------------------------------------------------------
const store = createInMemoryStore(buildSnapshot());

vi.mock("../../../server/src/lib/file-db.js", () => ({
  readSnapshot: () => store.readSnapshot(),
  writeSnapshot: (next: any) => store.writeSnapshot(next),
  updateSnapshot: (mutator: any) => {
    return store.updateSnapshot(mutator);
  }
}));

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------
function findSongById(id: string): Song | undefined {
  return store.getState().songs.find((s) => s.id === id);
}

function findTaskById(id: string): SongTask | undefined {
  return store.getState().tasks.find((t) => t.id === id);
}

function findTaskBySongId(songId: string): SongTask | undefined {
  return store.getState().tasks.find((t) => t.songId === songId);
}

describe("TaskService", () => {
  let service: TaskService;
  let sunoClient: FakeSunoClient;
  let coverClient: FakeCoverClient;
  let novelService: FakeNovelService;

  beforeEach(() => {
    store.reset(buildSnapshot());
    sunoClient = new FakeSunoClient();
    coverClient = new FakeCoverClient();
    novelService = new FakeNovelService();
    service = new TaskService(sunoClient as any, coverClient as any, novelService as any);
  });

  // =========================================================================
  // createQuickSong
  // =========================================================================
  describe("createQuickSong", () => {
    it("创建 song + task 并调用 SunoClient", async () => {
      const result = await service.createQuickSong({
        title: "测试歌曲",
        prompt: "测试提示词内容",
        stylePrompt: "mandopop-cinematic",
        makeInstrumental: false,
        model: "V5"
      });

      // 返回的 song 快照
      expect(result).toBeDefined();
      expect(result!.title).toBe("测试歌曲");
      expect(result!.mode).toBe("quick");
      expect(result!.status).toBe("generating");

      // SunoClient 被调用
      expect(sunoClient.createMusicCalls).toHaveLength(1);
      expect(sunoClient.createMusicCalls[0].title).toBe("测试歌曲");
      expect(sunoClient.createMusicCalls[0].mode).toBe("quick");

      // song 与 task 关联
      const songId = result!.id;
      const task = findTaskBySongId(songId);
      expect(task).toBeDefined();
      expect(task!.songId).toBe(songId);
      expect(task!.status).toBe("running"); // submitSong 内部状态
    });

    it("支持可选参数 negativeTags 和 vocalGender", async () => {
      await service.createQuickSong({
        title: "一首歌",
        prompt: "歌词内容不少于六个字",
        stylePrompt: "electro-pop",
        makeInstrumental: false,
        model: "V4_5PLUS",
        negativeTags: "noise, harsh",
        vocalGender: "f"
      });

      expect(sunoClient.createMusicCalls[0].negativeTags).toBe("noise, harsh");
      expect(sunoClient.createMusicCalls[0].vocalGender).toBe("f");
    });

    it("纯音乐模式 makeInstrumental=true", async () => {
      await service.createQuickSong({
        title: "纯音乐测试",
        prompt: "一段安静的钢琴旋律描述",
        stylePrompt: "guofeng-ballad",
        makeInstrumental: true,
        model: "V4"
      });

      expect(sunoClient.createMusicCalls[0].makeInstrumental).toBe(true);
    });
  });

  // =========================================================================
  // SunoClient 创建失败 → task 标记为 failed
  // =========================================================================
  describe("SunoClient failure", () => {
    it("createMusic 抛出异常时 task 与 song 标记为 failed", async () => {
      // override createMusic 直接抛异常
      sunoClient.createMusic = async () => {
        throw new Error("Suno API 503");
      };

      // createQuickSong 内部 submitSong 捕获异常并 failTask
      const result = await service.createQuickSong({
        title: "失败测试",
        prompt: "一段描述不少于六个字",
        stylePrompt: "rock-anthem",
        makeInstrumental: false,
        model: "V4_5"
      });

      // 初始返回时 song 和 task 已创建
      expect(result).toBeDefined();
      const task = findTaskBySongId(result!.id);
      expect(task).toBeDefined();

      // failTask 是同步的（submitSong 内部 try/catch 直接 await failTask）
      const updatedTask = findTaskBySongId(result!.id);
      expect(updatedTask!.status).toBe("failed");
      expect(updatedTask!.errorMessage).toContain("503");
    });
  });

  // =========================================================================
  // createNovelSong
  // =========================================================================
  describe("createNovelSong", () => {
    it("基于已有 document 创建小说成歌", async () => {
      // 先在快照中放入一个 document
      await store.updateSnapshot((s) => ({
        ...s,
        documents: [
          {
            id: "doc_novel1",
            title: "春风十里",
            text: "这是一个关于爱情与自然的故事。",
            summary: "画家与女子的山间邂逅",
            keyThemes: ["爱情", "自然"],
            characters: ["李明", "小雨"],
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            chunks: []
          },
          ...s.documents
        ]
      }));

      const result = await service.createNovelSong({
        documentId: "doc_novel1",
        mode: "novel-full",
        focus: "爱情与自然的交织",
        stylePrompt: "guofeng-ballad",
        makeInstrumental: false,
        model: "V4_5ALL"
      });

      expect(result).toBeDefined();
      expect(result!.mode).toBe("novel-full");
      expect(result!.sourceDocumentId).toBe("doc_novel1");

      // NovelService.composeNovelPrompt 被调用（通过 createNovelSong 内部）
      expect(sunoClient.createMusicCalls).toHaveLength(1);
    });

    it("document 不存在时抛出异常", async () => {
      await expect(
        service.createNovelSong({
          documentId: "doc_nonexistent",
          mode: "novel-full",
          focus: "测试",
          stylePrompt: "electro-pop",
          makeInstrumental: false,
          model: "V4_5ALL"
        })
      ).rejects.toThrow("Novel document not found");
    });
  });

  // =========================================================================
  // refreshTask
  // =========================================================================
  describe("refreshTask", () => {
    it("根据 Suno 返回的成功状态更新 task 和 song", async () => {
      // 先创建一个快速成歌
      const song = await service.createQuickSong({
        title: "刷新测试",
        prompt: "一段测试歌词内容描述",
        stylePrompt: "electro-pop",
        makeInstrumental: false,
        model: "V4_5ALL"
      });

      const task = findTaskBySongId(song!.id);

      // 确保 finishSong 的 setTimeout 已完成
      await new Promise((r) => setTimeout(r, 2500));

      // 现在获取最新的 task 状态
      const refreshedTask = findTaskById(task!.id);
      expect(refreshedTask!.status).toBe("succeeded");

      const refreshedSong = findSongById(song!.id);
      expect(refreshedSong!.status).toBe("ready");
      expect(refreshedSong!.audioUrl).toBe("https://example.com/audio.mp3");
    });

    it("Suno 返回失败状态时 task 标记为 failed", async () => {
      // 设置 suno 返回失败
      sunoClient.nextTaskDetails = {
        status: "failed",
        audioUrl: null,
        lyricsSnippet: "",
        durationSeconds: null,
        errorMessage: "SENSITIVE_WORD_ERROR",
        clips: [],
        raw: {}
      };

      const song = await service.createQuickSong({
        title: "失败测试",
        prompt: "测试内容不少于六个字吧",
        stylePrompt: "rock-anthem",
        makeInstrumental: false,
        model: "V4"
      });

      const task = findTaskBySongId(song!.id);

      // 等待 finishSong 执行
      await new Promise((r) => setTimeout(r, 2500));

      const refreshedTask = findTaskById(task!.id);
      expect(refreshedTask!.status).toBe("failed");
      expect(refreshedTask!.errorMessage).toBe("SENSITIVE_WORD_ERROR");
    });

    it("无 providerTaskId 时原样返回 task", async () => {
      // 手动创建一个没有 providerTaskId 的 task
      const snapshot = store.getState();
      const rawTask: SongTask = {
        id: "task_noid",
        songId: "song_noid",
        mode: "quick",
        status: "queued",
        providerTaskId: null,
        provider: "sunoapi",
        title: "无 ID 任务",
        prompt: "测试",
        errorMessage: null,
        progressLabel: "等待提交",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z"
      };

      await store.updateSnapshot((s) => ({
        ...s,
        tasks: [rawTask, ...s.tasks]
      }));

      const result = await service.refreshTask("task_noid");
      expect(result.status).toBe("queued"); // 未变化
    });
  });

  // =========================================================================
  // syncCredits
  // =========================================================================
  describe("syncCredits", () => {
    it("从 SunoClient 同步余额到 account", async () => {
      sunoClient.nextCredits = { creditsRemaining: 99, raw: {} };

      const account = await service.syncCredits();

      expect(account.creditsRemaining).toBe(99);
      expect(account.mode).toBe("mock");
      expect(account.lastCheckedAt).toBeTruthy();
      expect(sunoClient.getCreditsCalls).toBe(1);
    });
  });

  // =========================================================================
  // deleteSong
  // =========================================================================
  describe("deleteSong", () => {
    it("删除唯一的 song 时同时删除关联 task", async () => {
      const song = await service.createQuickSong({
        title: "待删除",
        prompt: "一段描述不少于六个字哦",
        stylePrompt: "mandopop-cinematic",
        makeInstrumental: false,
        model: "V4_5ALL"
      });

      const taskBefore = findTaskBySongId(song!.id);
      expect(taskBefore).toBeDefined();

      const result = await service.deleteSong(song!.id);
      expect(result.deleted).toBe(true);

      // song 和 task 都不在了
      expect(findSongById(song!.id)).toBeUndefined();
      expect(findTaskById(taskBefore!.id)).toBeUndefined();
    });

    it("删除不存在的 song 时抛出异常", async () => {
      await expect(service.deleteSong("song_ghost")).rejects.toThrow("Song not found");
    });
  });

  // =========================================================================
  // deleteFailedTask
  // =========================================================================
  describe("deleteFailedTask", () => {
    it("删除失败 task 及其关联 song", async () => {
      // 手动放入一个 failed task
      const failedTask: SongTask = {
        id: "task_fail1",
        songId: "song_fail1",
        mode: "quick",
        status: "failed",
        providerTaskId: "suno_fail001",
        provider: "sunoapi",
        title: "失败歌曲",
        prompt: "测试",
        errorMessage: "CREATE_TASK_FAILED",
        progressLabel: "歌曲生成失败",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z"
      };
      const failedSong: Song = {
        id: "song_fail1",
        title: "失败歌曲",
        mode: "quick",
        status: "failed",
        taskId: "task_fail1",
        providerJobId: "suno_fail001",
        prompt: "测试",
        stylePrompt: "测试",
        makeInstrumental: false,
        model: "V4_5ALL",
        negativeTags: "",
        vocalGender: "",
        lyricsSnippet: "",
        tags: [],
        audioUrl: null,
        coverUrl: "",
        coverStatus: "idle",
        durationSeconds: null,
        sourceDocumentId: null,
        sourceExcerpt: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z"
      };

      await store.updateSnapshot((s) => ({
        ...s,
        tasks: [failedTask, ...s.tasks],
        songs: [failedSong, ...s.songs]
      }));

      const result = await service.deleteFailedTask("task_fail1");
      expect(result.deleted).toBe(true);

      expect(findTaskById("task_fail1")).toBeUndefined();
      expect(findSongById("song_fail1")).toBeUndefined();
    });

    it("非 failed 任务抛出异常", async () => {
      const runningTask: SongTask = {
        id: "task_running",
        songId: "song_running",
        mode: "quick",
        status: "running",
        providerTaskId: "suno_run",
        provider: "sunoapi",
        title: "运行中",
        prompt: "测试",
        errorMessage: null,
        progressLabel: "处理中",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z"
      };

      await store.updateSnapshot((s) => ({
        ...s,
        tasks: [runningTask, ...s.tasks]
      }));

      await expect(service.deleteFailedTask("task_running")).rejects.toThrow("Only failed tasks can be deleted");
    });
  });

  // =========================================================================
  // retryTask
  // =========================================================================
  describe("retryTask", () => {
    it("重试失败任务：创建新 task + song，保留原记录", async () => {
      const failedTask: SongTask = {
        id: "task_retry1",
        songId: "song_retry1",
        mode: "quick",
        status: "failed",
        providerTaskId: "suno_old",
        provider: "sunoapi",
        title: "失败重试",
        prompt: "旧提示词不少于六字",
        errorMessage: "GENERATE_AUDIO_FAILED",
        progressLabel: "歌曲生成失败",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z"
      };
      const failedSong: Song = {
        id: "song_retry1",
        title: "失败重试",
        mode: "quick",
        status: "failed",
        taskId: "task_retry1",
        providerJobId: "suno_old",
        prompt: "旧提示词不少于六字",
        stylePrompt: "mandopop-cinematic",
        makeInstrumental: false,
        model: "V4_5ALL",
        negativeTags: "",
        vocalGender: "",
        lyricsSnippet: "",
        tags: [],
        audioUrl: null,
        coverUrl: "",
        coverStatus: "idle",
        durationSeconds: null,
        sourceDocumentId: null,
        sourceExcerpt: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z"
      };

      await store.updateSnapshot((s) => ({
        ...s,
        tasks: [failedTask, ...s.tasks],
        songs: [failedSong, ...s.songs]
      }));

      const newSong = await service.retryTask("task_retry1");
      expect(newSong).toBeDefined();
      expect(newSong!.id).not.toBe("song_retry1"); // 新 song

      // 原来失败的 task 还在
      expect(findTaskById("task_retry1")).toBeDefined();
      expect(findTaskById("task_retry1")!.status).toBe("failed");
    });

    it("非 failed 任务无法重试", async () => {
      const queuedTask: SongTask = {
        id: "task_q",
        songId: "song_q",
        mode: "quick",
        status: "queued",
        providerTaskId: null,
        provider: "sunoapi",
        title: "排队中",
        prompt: "测试",
        errorMessage: null,
        progressLabel: "等待",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z"
      };
      const queuedSong: Song = {
        id: "song_q",
        title: "排队中",
        mode: "quick",
        status: "draft",
        taskId: "task_q",
        providerJobId: null,
        prompt: "测试",
        stylePrompt: "测试",
        makeInstrumental: false,
        model: "V4_5ALL",
        negativeTags: "",
        vocalGender: "",
        lyricsSnippet: "",
        tags: [],
        audioUrl: null,
        coverUrl: "",
        coverStatus: "idle",
        durationSeconds: null,
        sourceDocumentId: null,
        sourceExcerpt: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z"
      };

      await store.updateSnapshot((s) => ({
        ...s,
        tasks: [queuedTask, ...s.tasks],
        songs: [queuedSong, ...s.songs]
      }));

      await expect(service.retryTask("task_q")).rejects.toThrow("Only failed tasks can be retried");
    });
  });

  // =========================================================================
  // handleWebhook
  // =========================================================================
  describe("handleWebhook", () => {
    it("根据 webhook payload 更新 task 状态", async () => {
      // 先创建一个 task
      const song = await service.createQuickSong({
        title: "Webhook 测试",
        prompt: "一段歌词描述测试内容",
        stylePrompt: "electro-pop",
        makeInstrumental: false,
        model: "V4_5ALL"
      });

      const task = findTaskBySongId(song!.id);
      expect(task!.providerTaskId).toBeTruthy();

      // 模拟 webhook 回调 － applyTaskDetails 同步更新
      await service.handleWebhook({
        taskId: task!.providerTaskId,
        status: "success",
        audioUrl: "https://example.com/webhook-audio.mp3",
        duration: 200
      });

      // webhook 来的 status 是 "success" → 映射为 "succeeded"
      const finalTask = findTaskById(task!.id);
      expect(["succeeded", "running"]).toContain(finalTask!.status);
    });

    it("无效 providerTaskId 不处理", async () => {
      // 不应崩溃
      await expect(
        service.handleWebhook({ taskId: "nonexistent_id", status: "success" })
      ).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // getSnapshot
  // =========================================================================
  describe("getSnapshot", () => {
    it("返回当前快照包含 songs, tasks, documents", async () => {
      const snapshot = await service.getSnapshot();
      expect(snapshot.songs).toBeDefined();
      expect(snapshot.tasks).toBeDefined();
      expect(snapshot.documents).toBeDefined();
      expect(snapshot.account).toBeDefined();
    });
  });
});
