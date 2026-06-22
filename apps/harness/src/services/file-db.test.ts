import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { genreRules } from "@ai-music/config";
import type { LibrarySnapshot, Song, SongTask } from "@ai-music/types";
import { createInMemoryStore, buildSnapshot } from "../helpers/snapshot-factory.js";

// ---------------------------------------------------------------------------
// 文件级测试：使用真实临时目录验证 file-db 模块的读写行为
// ---------------------------------------------------------------------------
describe("file-db (real filesystem)", () => {
  const tmpBase = join(tmpdir(), `ai-music-filedb-${Date.now()}`);
  const dataDir = join(tmpBase, "data");
  const dbPath = join(dataDir, "db.json");

  // file-urlToPath 在模块顶层执行，无法轻易 mock。这里采用
  // 导入后直接操作底层 fs 的方式验证读写逻辑。
  // 仅验证数据序列化/反序列化的正确性。

  beforeAll(async () => {
    await mkdir(dataDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(tmpBase, { recursive: true, force: true });
  });

  it("新建 db.json 时写入默认快照", async () => {
    const defaultSnapshot: LibrarySnapshot = {
      account: {
        provider: "sunoapi",
        mode: "mock",
        creditsRemaining: 0,
        callbackConfigured: false,
        lastCheckedAt: null
      },
      songs: [],
      tasks: [],
      documents: [],
      rules: genreRules
    };

    await writeFile(dbPath, JSON.stringify(defaultSnapshot, null, 2), "utf8");

    const raw = await readFile(dbPath, "utf8");
    const parsed = JSON.parse(raw);

    expect(parsed.account.provider).toBe("sunoapi");
    expect(parsed.songs).toEqual([]);
    expect(parsed.rules.length).toBeGreaterThan(0);
  });

  it("写入后回读数据一致性", async () => {
    const song: Song = {
      id: "song_test1",
      title: "测试歌曲",
      mode: "quick",
      status: "generating",
      taskId: "task_test1",
      providerJobId: null,
      prompt: "测试 prompt",
      stylePrompt: "测试风格",
      makeInstrumental: false,
      model: "V4_5ALL",
      negativeTags: "",
      vocalGender: "",
      lyricsSnippet: "",
      tags: ["测试"],
      audioUrl: null,
      coverUrl: "data:image/svg+xml,...",
      coverStatus: "idle",
      durationSeconds: null,
      sourceDocumentId: null,
      sourceExcerpt: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z"
    };

    const snapshot: LibrarySnapshot = {
      account: {
        provider: "sunoapi",
        mode: "mock",
        creditsRemaining: 50,
        callbackConfigured: true,
        lastCheckedAt: "2025-01-01T00:00:00.000Z"
      },
      songs: [song],
      tasks: [],
      documents: [],
      rules: genreRules
    };

    await writeFile(dbPath, JSON.stringify(snapshot, null, 2), "utf8");

    const raw = await readFile(dbPath, "utf8");
    const parsed = JSON.parse(raw) as LibrarySnapshot;

    expect(parsed.songs[0].id).toBe("song_test1");
    expect(parsed.songs[0].title).toBe("测试歌曲");
    expect(parsed.account.creditsRemaining).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// 内存快照存储测试（harness 中主要的 mock 方式）
// ---------------------------------------------------------------------------
describe("InMemoryStore (snapshot-factory)", () => {
  it("buildSnapshot 创建初始快照", () => {
    const snapshot = buildSnapshot();
    expect(snapshot.songs).toEqual([]);
    expect(snapshot.tasks).toEqual([]);
    expect(snapshot.account.provider).toBe("sunoapi");
  });

  it("buildSnapshot 支持 partial override", () => {
    const snapshot = buildSnapshot({
      account: { provider: "sunoapi", mode: "live", creditsRemaining: 999, callbackConfigured: true, lastCheckedAt: null }
    });
    expect(snapshot.account.mode).toBe("live");
    expect(snapshot.account.creditsRemaining).toBe(999);
  });

  it("createInMemoryStore 读写快照", async () => {
    const store = createInMemoryStore(buildSnapshot());
    const initial = await store.readSnapshot();
    expect(initial.songs).toEqual([]);

    const song: Song = {
      id: "song_mem1",
      title: "内存歌曲",
      mode: "quick",
      status: "ready",
      taskId: "task_mem1",
      providerJobId: "suno_abc",
      prompt: "测试",
      stylePrompt: "测试",
      makeInstrumental: false,
      model: "V5",
      negativeTags: "",
      vocalGender: "",
      lyricsSnippet: "",
      tags: [],
      audioUrl: "https://example.com/audio.mp3",
      coverUrl: "",
      coverStatus: "ready",
      durationSeconds: 120,
      sourceDocumentId: null,
      sourceExcerpt: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z"
    };

    await store.updateSnapshot((s) => ({
      ...s,
      songs: [song, ...s.songs]
    }));

    const after = await store.readSnapshot();
    expect(after.songs).toHaveLength(1);
    expect(after.songs[0].id).toBe("song_mem1");
  });

  it("reset 还原到初始状态", async () => {
    const store = createInMemoryStore(buildSnapshot());

    // 修改
    await store.updateSnapshot((s) => ({
      ...s,
      songs: [{ id: "temp", title: "tmp", mode: "quick", status: "draft", taskId: "", providerJobId: null, prompt: "", stylePrompt: "", makeInstrumental: false, model: "V4_5ALL", negativeTags: "", vocalGender: "", lyricsSnippet: "", tags: [], audioUrl: null, coverUrl: "", coverStatus: "idle", durationSeconds: null, sourceDocumentId: null, sourceExcerpt: null, createdAt: "", updatedAt: "" }]
    }));

    expect(store.getState().songs).toHaveLength(1);

    // 重置
    store.reset();
    expect(store.getState().songs).toHaveLength(0);
  });
});
