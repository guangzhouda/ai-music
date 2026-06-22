import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";

import { createInMemoryStore, buildSnapshot } from "../helpers/snapshot-factory.js";
import type { InMemoryStore } from "../helpers/snapshot-factory.js";

// ---------------------------------------------------------------------------
// 共享 mock 与 fixture（与 api.test.ts 相同的 mock 策略）
// ---------------------------------------------------------------------------
let store: InMemoryStore;

vi.mock("../../../server/src/lib/file-db.js", () => ({
  readSnapshot: () => store.readSnapshot(),
  writeSnapshot: (next: any) => store.writeSnapshot(next),
  updateSnapshot: (mutator: any) => store.updateSnapshot(mutator)
}));

vi.mock("../../../server/src/services/settings-service.js", async () => {
  const actual = await vi.importActual<any>("../../../server/src/services/settings-service.js");
  return { ...actual, hydrateRuntimeSettings: () => Promise.resolve() };
});

vi.mock("../../../server/src/services/prompt-asset-service.js", async () => {
  const asset = (key: string, title: string) => ({
    key,
    title,
    description: "T",
    targetModel: "deepseek" as const,
    systemPrompt: "You are an assistant. Output JSON with fields as requested."
  });
  return {
    getPromptAssetLibrary: () =>
      Promise.resolve({
        updatedAt: null,
        assets: [
          asset("document-analysis", "全文分析"),
          asset("segment-analysis", "分段分析"),
          asset("summary-merge", "总览汇总"),
          asset("novel-song-plan", "小说成歌")
        ]
      }),
    savePromptAssetLibrary: (input: any) => Promise.resolve(input),
    getPromptAssetMap: () =>
      Promise.resolve({
        "document-analysis": asset("document-analysis", "全文分析"),
        "segment-analysis": asset("segment-analysis", "分段分析"),
        "summary-merge": asset("summary-merge", "总览汇总"),
        "novel-song-plan": asset("novel-song-plan", "小说成歌")
      })
  };
});

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------
async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollUntil(
  fn: () => Promise<boolean>,
  timeoutMs = 8000,
  intervalMs = 500
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await sleep(intervalMs);
  }
  throw new Error("Poll timeout");
}

/**
 * 等待所有 pending finishSong 完成（约 2 秒），
 * 避免 store 重置后出现未处理 rejection。
 */
async function drainFinishSong() {
  await sleep(2500);
}

// ---------------------------------------------------------------------------
// E2E: 快速成歌全链路
// ---------------------------------------------------------------------------
describe("E2E: Quick Song Workflow", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    store = createInMemoryStore(buildSnapshot());
    const { buildServer } = await import("../../../server/src/index.js");
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    store.reset(buildSnapshot());
  });

  it("完整流程：一键成歌 → 刷新任务 → 获取音频", async () => {
    // Step 1: 创建歌曲
    const createRes = await app.inject({
      method: "POST",
      url: "/api/generate/quick",
      payload: {
        title: "E2E 测试 · 春风",
        prompt: "春风轻轻吹过山间，唤醒了沉睡的大地。花开的声音在耳畔回响，如同远方传来的歌谣。",
        stylePrompt: "mandopop-cinematic",
        makeInstrumental: false,
        model: "V5"
      }
    });

    expect(createRes.statusCode).toBe(201);
    const song = createRes.json();
    expect(song.id).toMatch(/^song_/);
    expect(song.status).toBe("generating");

    const songId = song.id;

    // Step 2: 查找关联 task
    const tasksRes = await app.inject({ method: "GET", url: "/api/tasks" });
    const tasks = tasksRes.json();
    const task = tasks.find((t: any) => t.songId === songId);
    expect(task).toBeDefined();
    expect(task.status).toBe("running");

    // Step 3: 等待 finishSong 完成（mock 模式下约 1.2s）
    await pollUntil(async () => {
      const res = await app.inject({ method: "GET", url: "/api/songs" });
      const songs = res.json();
      const s = songs.find((s: any) => s.id === songId);
      return s?.status === "ready";
    }, 5000);

    // Step 4: 验证歌曲已就绪
    const songsRes = await app.inject({ method: "GET", url: "/api/songs" });
    const updatedSong = songsRes.json().find((s: any) => s.id === songId);
    expect(updatedSong.status).toBe("ready");
    expect(updatedSong.audioUrl).toBeTruthy();
    expect(updatedSong.durationSeconds).toBeGreaterThan(0);
  });

  it("完整流程：音乐库 → 删除歌曲 → 验证清理", async () => {
    // Step 1: 创建
    const createRes = await app.inject({
      method: "POST",
      url: "/api/generate/quick",
      payload: {
        title: "E2E 删除测试",
        prompt: "这是一首会被删除的测试歌曲的歌词",
        stylePrompt: "rock-anthem",
        makeInstrumental: false,
        model: "V4"
      }
    });
    const songId = createRes.json().id;

    // Step 2: 验证存在于列表
    let list = await app.inject({ method: "GET", url: "/api/songs" });
    expect(list.json()).toHaveLength(1);

    // Step 3: 删除
    const delRes = await app.inject({ method: "DELETE", url: `/api/songs/${songId}` });
    expect(delRes.statusCode).toBe(200);
    expect(delRes.json().deleted).toBe(true);

    // Step 4: 验证列表为空，task 也一并删除
    list = await app.inject({ method: "GET", url: "/api/songs" });
    expect(list.json()).toHaveLength(0);

    const tasks = await app.inject({ method: "GET", url: "/api/tasks" });
    expect(tasks.json()).toHaveLength(0);
  });

  it("完整流程：账户余额同步", async () => {
    // Step 1: 初始状态
    const initialRes = await app.inject({ method: "GET", url: "/api/account" });
    const initial = initialRes.json();
    expect(initial.mode).toBe("mock");
    expect(initial.creditsRemaining).toBe(128);

    // Step 2: 同步（mock 模式返回固定值）
    const syncRes = await app.inject({ method: "GET", url: "/api/account" });
    expect(syncRes.statusCode).toBe(200);
    expect(syncRes.json().creditsRemaining).toBe(128);
  });
});

// ---------------------------------------------------------------------------
// E2E: 小说成歌全链路
// ---------------------------------------------------------------------------
describe("E2E: Novel Song Workflow", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    store = createInMemoryStore(buildSnapshot());
    const { buildServer } = await import("../../../server/src/index.js");
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    store.reset(buildSnapshot());
  });

  it("完整流程：导入小说 → 生成预览 → 提交成歌", async () => {
    // Step 1: 导入小说
    const importRes = await app.inject({
      method: "POST",
      url: "/api/novels/import",
      payload: {
        title: "春风十里",
        text: `春风十里不如你，这是一个人与自然的故事。

画家李明在大城市的喧嚣中感到疲惫，他决定到山间写生，寻找内心的平静。

在山脚下的小村庄里，他遇到了一位名叫小雨的神秘女子。小雨每天上山采药，对画家的到来既好奇又期待。

两人在山间的小路上相遇。李明被小雨纯真的笑容所打动，开始为她画像。

一天，暴雨突至，两人被困在山中的小亭子里。在闪电与雷鸣中，他们分享了自己最深的秘密。

雨过天晴后，李明完成了一幅他一生中最满意的画作——画中是雨后的山谷，和小雨站在阳光下的背影。

夏天结束时，李明必须回到城市。临别前，小雨送给他一朵山间的野花。他说：我会回来。

回到城市后，李明举办了个人画展。那幅山间画作引起了轰动。但他知道，真正的美不在画布上，而在那个夏天。`
      }
    });

    expect(importRes.statusCode).toBe(201);
    const doc = importRes.json();
    expect(doc.id).toMatch(/^doc_/);
    expect(doc.keyThemes.length).toBeGreaterThan(0);
    expect(doc.characters.length).toBeGreaterThan(0);

    // Step 2: 生成小说成歌预览
    const previewRes = await app.inject({
      method: "POST",
      url: "/api/generate/novel/preview",
      payload: {
        documentId: doc.id,
        mode: "novel-full",
        focus: "李明与小雨的爱情故事",
        stylePrompt: "mandopop-cinematic",
        makeInstrumental: false,
        model: "V5"
      }
    });

    expect(previewRes.statusCode).toBe(200);
    const draft = previewRes.json();
    expect(draft.title).toBeTruthy();
    expect(draft.prompt).toBeTruthy();
    expect(draft.prompt.length).toBeGreaterThan(10);

    // Step 3: 用户修改后提交
    const submitRes = await app.inject({
      method: "POST",
      url: "/api/generate/novel",
      payload: {
        documentId: doc.id,
        mode: "novel-full",
        focus: "李明与小雨的爱情故事",
        stylePrompt: "mandopop-cinematic",
        makeInstrumental: false,
        model: "V5",
        title: "山间春风",
        prompt: draft.prompt + " 请用温柔抒情的方式表达。"
      }
    });

    expect(submitRes.statusCode).toBe(201);
    const song = submitRes.json();
    expect(song.mode).toBe("novel-full");
    expect(song.sourceDocumentId).toBe(doc.id);

    // Step 4: 等待生成完成
    await pollUntil(async () => {
      const res = await app.inject({ method: "GET", url: "/api/songs" });
      const songs = res.json();
      const s = songs.find((s: any) => s.id === song.id);
      return s?.status === "ready";
    }, 5000);

    const finalSongs = await app.inject({ method: "GET", url: "/api/songs" });
    const finalSong = finalSongs.json().find((s: any) => s.id === song.id);
    expect(finalSong.status).toBe("ready");
    expect(finalSong.audioUrl).toBeTruthy();
  });
});
