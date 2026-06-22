import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

import { createInMemoryStore, buildSnapshot } from "../helpers/snapshot-factory.js";

// ---------------------------------------------------------------------------
// Mock file-db → 所有路由直接读写内存快照
// ---------------------------------------------------------------------------
const store = createInMemoryStore(buildSnapshot());

vi.mock("../../../server/src/lib/file-db.js", () => ({
  readSnapshot: () => store.readSnapshot(),
  writeSnapshot: (next: any) => store.writeSnapshot(next),
  updateSnapshot: (mutator: any) => store.updateSnapshot(mutator)
}));

// 避免 hydrateRuntimeSettings 读取 settings.json 失败
vi.mock("../../../server/src/services/settings-service.js", async () => {
  const actual = await vi.importActual<any>("../../../server/src/services/settings-service.js");
  return {
    ...actual,
    hydrateRuntimeSettings: () => Promise.resolve()
  };
});

// Mock prompt-assets 读取（避免文件不存在报错）
vi.mock("../../../server/src/services/prompt-asset-service.js", async () => {
  const defaultAsset = {
    key: "document-analysis",
    title: "全文分析",
    description: "T",
    targetModel: "deepseek" as const,
    systemPrompt: "You are an analyzer. Output JSON."
  };
  return {
    getPromptAssetLibrary: () =>
      Promise.resolve({
        updatedAt: null,
        assets: [
          defaultAsset,
          { ...defaultAsset, key: "segment-analysis", title: "分段分析" },
          { ...defaultAsset, key: "summary-merge", title: "总览汇总" },
          { ...defaultAsset, key: "novel-song-plan", title: "小说成歌" }
        ]
      }),
    savePromptAssetLibrary: (input: any) => Promise.resolve(input),
    getPromptAssetMap: () =>
      Promise.resolve({
        "document-analysis": defaultAsset,
        "segment-analysis": { ...defaultAsset, key: "segment-analysis" as any, title: "分段分析" },
        "summary-merge": { ...defaultAsset, key: "summary-merge" as any, title: "总览汇总" },
        "novel-song-plan": { ...defaultAsset, key: "novel-song-plan" as any, title: "小说成歌" }
      })
  };
});

describe("API routes (Fastify inject)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // 使用动态导入避免模块缓存中的文件系统调用
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

  // =========================================================================
  // Health
  // =========================================================================
  describe("GET /api/health", () => {
    it("返回 ok 状态", async () => {
      const res = await app.inject({ method: "GET", url: "/api/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
    });
  });

  // =========================================================================
  // Overview
  // =========================================================================
  describe("GET /api/overview", () => {
    it("返回快照全量数据", async () => {
      const res = await app.inject({ method: "GET", url: "/api/overview" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.songs).toBeDefined();
      expect(body.tasks).toBeDefined();
      expect(body.documents).toBeDefined();
      expect(body.rules).toBeDefined();
    });
  });

  // =========================================================================
  // 快速成歌
  // =========================================================================
  describe("POST /api/generate/quick", () => {
    it("创建歌曲并返回 song 记录", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/generate/quick",
        payload: {
          title: "API 测试歌曲",
          prompt: "春天的风轻轻吹过",
          stylePrompt: "mandopop-cinematic",
          makeInstrumental: false,
          model: "V5"
        }
      });

      expect(res.statusCode).toBe(201);
      const song = res.json();
      expect(song.id).toMatch(/^song_/);
      expect(song.title).toBe("API 测试歌曲");
      expect(song.mode).toBe("quick");
      expect(song.status).toBe("generating");
    });

    it("prompt 过短时返回 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/generate/quick",
        payload: {
          title: "T",
          prompt: "短",
          stylePrompt: "electro-pop",
          makeInstrumental: false,
          model: "V4"
        }
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBeDefined();
    });

    it("缺少必填字段返回 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/generate/quick",
        payload: { title: "T" }
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // 小说导入
  // =========================================================================
  describe("POST /api/novels/import", () => {
    it("导入小说并返回 document", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/novels/import",
        payload: {
          title: "测试小说",
          text: "春风十里不如你。这是一个关于爱情与自然的故事。画家在山间写生时遇到了神秘女子小雨，两人从此展开了一段跨越季节的旅程。山间的宁静让画家找到了内心真正的平静。"
        }
      });

      expect(res.statusCode).toBe(201);
      const doc = res.json();
      expect(doc.id).toMatch(/^doc_/);
      expect(doc.title).toBe("测试小说");
      expect(doc.summary).toBeTruthy();
      expect(doc.keyThemes).toBeInstanceOf(Array);
      expect(doc.characters).toBeInstanceOf(Array);
    });

    it("正文太短时返回 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/novels/import",
        payload: {
          title: "短篇",
          text: "太短"
        }
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // 小说成歌预览
  // =========================================================================
  describe("POST /api/generate/novel/preview", () => {
    it("基于已导入文档生成预览", async () => {
      // 先导入文档
      const importRes = await app.inject({
        method: "POST",
        url: "/api/novels/import",
        payload: {
          title: "预览测试",
          text: "这是一个关于冒险和友情的故事。主人公小明和他的朋友们一起踏上了寻找宝藏的旅程。在这个过程中，他们不仅发现了珍贵的宝物，更收获了真挚的友谊。"
        }
      });
      const doc = importRes.json();

      const res = await app.inject({
        method: "POST",
        url: "/api/generate/novel/preview",
        payload: {
          documentId: doc.id,
          mode: "novel-full",
          focus: "冒险与友情",
          stylePrompt: "rock-anthem",
          makeInstrumental: false,
          model: "V4_5ALL"
        }
      });

      expect(res.statusCode).toBe(200);
      const preview = res.json();
      expect(preview.title).toBeTruthy();
      expect(preview.prompt).toBeTruthy();
      expect(preview.stylePrompt).toBeTruthy();
    });

    it("文档不存在时返回 500", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/generate/novel/preview",
        payload: {
          documentId: "doc_ghost",
          mode: "novel-full",
          focus: "测试",
          stylePrompt: "electro-pop",
          makeInstrumental: false,
          model: "V5"
        }
      });

      expect(res.statusCode).toBe(500);
    });
  });

  // =========================================================================
  // 小说成歌提交
  // =========================================================================
  describe("POST /api/generate/novel", () => {
    it("提交小说成歌到 Suno", async () => {
      // 先导入
      const importRes = await app.inject({
        method: "POST",
        url: "/api/novels/import",
        payload: {
          title: "提交测试",
          text: "一个关于勇气和成长的故事。主角在逆境中不断挑战自己，最终实现了梦想。这段旅程充满了泪水与欢笑。"
        }
      });
      const doc = importRes.json();

      const res = await app.inject({
        method: "POST",
        url: "/api/generate/novel",
        payload: {
          documentId: doc.id,
          mode: "novel-full",
          focus: "勇气与成长",
          stylePrompt: "guofeng-ballad",
          makeInstrumental: false,
          model: "V4_5ALL"
        }
      });

      expect(res.statusCode).toBe(201);
      const song = res.json();
      expect(song.id).toMatch(/^song_/);
      expect(song.mode).toBe("novel-full");
      expect(song.sourceDocumentId).toBe(doc.id);
    });
  });

  // =========================================================================
  // Songs & Tasks 列表
  // =========================================================================
  describe("GET /api/songs / GET /api/tasks", () => {
    it("返回空列表", async () => {
      const songsRes = await app.inject({ method: "GET", url: "/api/songs" });
      expect(songsRes.statusCode).toBe(200);
      expect(songsRes.json()).toEqual([]);

      const tasksRes = await app.inject({ method: "GET", url: "/api/tasks" });
      expect(tasksRes.statusCode).toBe(200);
      expect(tasksRes.json()).toEqual([]);
    });

    it("创建歌曲后列表包含记录", async () => {
      await app.inject({
        method: "POST",
        url: "/api/generate/quick",
        payload: {
          title: "列表测试",
          prompt: "一段歌词用来测试列表",
          stylePrompt: "electro-pop",
          makeInstrumental: false,
          model: "V5"
        }
      });

      const songsRes = await app.inject({ method: "GET", url: "/api/songs" });
      expect(songsRes.json()).toHaveLength(1);

      const tasksRes = await app.inject({ method: "GET", url: "/api/tasks" });
      expect(tasksRes.json()).toHaveLength(1);
    });
  });

  // =========================================================================
  // 删除歌曲
  // =========================================================================
  describe("DELETE /api/songs/:songId", () => {
    it("删除已存在的歌曲", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/api/generate/quick",
        payload: {
          title: "删除测试",
          prompt: "测试删除的歌词内容",
          stylePrompt: "rock-anthem",
          makeInstrumental: false,
          model: "V4"
        }
      });
      const songId = createRes.json().id;

      const delRes = await app.inject({
        method: "DELETE",
        url: `/api/songs/${songId}`
      });
      expect(delRes.statusCode).toBe(200);
      expect(delRes.json().deleted).toBe(true);

      // 再次查询列表为空
      const listRes = await app.inject({ method: "GET", url: "/api/songs" });
      expect(listRes.json()).toHaveLength(0);
    });
  });

  // =========================================================================
  // 账户
  // =========================================================================
  describe("GET /api/account", () => {
    it("返回 mock 模式余额信息", async () => {
      const res = await app.inject({ method: "GET", url: "/api/account" });
      expect(res.statusCode).toBe(200);
      const account = res.json();
      expect(account.creditsRemaining).toBe(128);
      expect(account.mode).toBe("mock");
    });
  });

  // =========================================================================
  // 音乐风格规则
  // =========================================================================
  describe("GET /api/rules", () => {
    it("返回内置风格规则列表", async () => {
      const res = await app.inject({ method: "GET", url: "/api/rules" });
      expect(res.statusCode).toBe(200);
      const rules = res.json();
      expect(rules).toHaveLength(4);
      expect(rules[0].slug).toBe("mandopop-cinematic");
    });
  });

  // =========================================================================
  // 设置
  // =========================================================================
  describe("GET /api/settings", () => {
    it("返回当前运行时设置快照", async () => {
      const res = await app.inject({ method: "GET", url: "/api/settings" });
      expect(res.statusCode).toBe(200);
      const settings = res.json();
      expect(typeof settings.mockMode).toBe("boolean");
      expect(settings.sunoBaseUrl).toBeDefined();
      expect(settings.deepseekModel).toBe("deepseek-chat");
    });
  });
});
