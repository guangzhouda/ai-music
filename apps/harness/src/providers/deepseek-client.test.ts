import { describe, it, expect } from "vitest";
import {
  DeepSeekClient,
  buildFallbackDocumentAnalysis,
  buildFallbackSongPlan
} from "../../../server/src/providers/deepseek-client.js";
import { buildTestEnv, buildLiveTestEnv } from "../helpers/test-env.js";

describe("DeepSeekClient", () => {
  // ---------------------------------------------------------------------------
  // 运行模式
  // ---------------------------------------------------------------------------
  describe("runtimeMode", () => {
    it("mock 模式或无 key 时返回 mock", () => {
      const client = new DeepSeekClient(buildTestEnv({ mockMode: true }));
      expect(client.runtimeMode).toBe("mock");

      const noKeyClient = new DeepSeekClient(buildTestEnv({ mockMode: false, deepseekApiKey: "" }));
      expect(noKeyClient.runtimeMode).toBe("mock");
    });

    it("live 模式且有 key 时返回 live", () => {
      const client = new DeepSeekClient(buildLiveTestEnv());
      expect(client.runtimeMode).toBe("live");
    });
  });

  // ---------------------------------------------------------------------------
  // analyzeDocument (mock)
  // ---------------------------------------------------------------------------
  describe("analyzeDocument", () => {
    const sampleText = `春风十里不如你。这是一个人与自然的故事。小说讲述了一位画家在山间写生时，遇到了一位神秘的女子。两人从此展开了一段跨越季节的旅程。

    画家名叫李明，来自大城市的他一直被都市的喧嚣所困扰。山间的宁静让他找到了内心真正的平静。

    神秘的女子叫小雨，她住在山脚下的小村庄，每天都会上山采药。她对画家的到来既好奇又期待。

    两人在山间的小路上相遇，画家被小雨纯真的笑容所打动。他开始为她画像，每一笔都充满了他对这片土地的热爱。`;

    it("mock 模式返回基于关键词提取的分析结果", async () => {
      const client = new DeepSeekClient(buildTestEnv());
      const result = await client.analyzeDocument("春风十里", sampleText);

      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.keyThemes).toBeInstanceOf(Array);
      expect(result.keyThemes.length).toBeGreaterThan(0);
      expect(result.characters).toBeInstanceOf(Array);
    });

    it("短文（单段）走 mock 分析", async () => {
      const client = new DeepSeekClient(buildTestEnv());
      const shortText = "春风十里不如你。这是一个关于爱情的故事。";
      const result = await client.analyzeDocument("短篇", shortText);

      expect(result.summary).toBeTruthy();
    });

    it("空文本也返回占位摘要", async () => {
      const client = new DeepSeekClient(buildTestEnv());
      const result = await client.analyzeDocument("空文本", "");

      expect(result.summary).toBe("暂无摘要，等待导入正文。");
    });
  });

  // ---------------------------------------------------------------------------
  // composeNovelSongPlan (mock)
  // ---------------------------------------------------------------------------
  describe("composeNovelSongPlan", () => {
    const mockDocument = {
      id: "doc_001",
      title: "春风十里",
      text: "sample text",
      summary: "一个画家的山间故事",
      keyThemes: ["爱情", "自然", "成长"],
      characters: ["李明", "小雨"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chunks: []
    };

    it("mock 模式返回 fallback song plan", async () => {
      const client = new DeepSeekClient(buildTestEnv());
      const result = await client.composeNovelSongPlan({
        document: mockDocument,
        input: {
          documentId: "doc_001",
          mode: "novel-full",
          focus: "爱情与自然的交织",
          stylePrompt: "mandopop-cinematic",
          makeInstrumental: false,
          model: "V4_5ALL"
        },
        relatedText: "sample text",
        styleText: "华语流行电影感"
      });

      expect(result.title).toContain("春风十里");
      expect(result.title).toContain("全文成歌");
      expect(result.prompt).toBeTruthy();
      expect(result.stylePrompt).toBe("华语流行电影感");
    });

    it("纯音乐模式生成不含歌词要求的计划", async () => {
      const client = new DeepSeekClient(buildTestEnv());
      const result = await client.composeNovelSongPlan({
        document: mockDocument,
        input: {
          documentId: "doc_001",
          mode: "scene-score",
          focus: "山间清晨的宁静",
          stylePrompt: "electro-pop",
          makeInstrumental: true,
          model: "V5"
        },
        relatedText: "",
        styleText: "电子流行"
      });

      expect(result.prompt).toContain("纯音乐");
      expect(result.title).toContain("纯音乐");
    });
  });

  // ---------------------------------------------------------------------------
  // buildFallbackDocumentAnalysis
  // ---------------------------------------------------------------------------
  describe("buildFallbackDocumentAnalysis", () => {
    it("从文本中提取关键词和摘要", () => {
      const text = "这是一个关于勇气和友情的故事。主人公小明和朋友们一起踏上了冒险之旅。";
      const result = buildFallbackDocumentAnalysis("冒险记", text);

      expect(result.summary).toBeTruthy();
      expect(result.keyThemes.length).toBeGreaterThanOrEqual(0);
      expect(result.characters.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // buildFallbackSongPlan
  // ---------------------------------------------------------------------------
  describe("buildFallbackSongPlan", () => {
    const doc = {
      id: "doc_001",
      title: "测试小说",
      text: "正文",
      summary: "摘要",
      keyThemes: ["爱情"],
      characters: ["张三"],
      createdAt: "",
      updatedAt: "",
      chunks: []
    };

    it("novel-full 模式生成完整计划", () => {
      const plan = buildFallbackSongPlan(
        doc,
        { documentId: "doc_001", mode: "novel-full", focus: "主线", stylePrompt: "rock-anthem", makeInstrumental: false, model: "V4" },
        "相关正文", "摇滚主题曲"
      );

      expect(plan.title).toContain("全文成歌");
      expect(plan.prompt).toContain("安全要求");
      expect(plan.stylePrompt).toBe("摇滚主题曲");
    });

    it("character-theme 模式", () => {
      const plan = buildFallbackSongPlan(
        doc,
        { documentId: "doc_001", mode: "character-theme", focus: "张三", stylePrompt: "guofeng-ballad", makeInstrumental: false, model: "V4_5" },
        "相关正文", "国风抒情"
      );

      expect(plan.title).toContain("角色主题曲");
    });
  });
});
