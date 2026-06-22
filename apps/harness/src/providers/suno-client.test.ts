import { describe, it, expect } from "vitest";
import { SunoClient } from "../../../server/src/providers/suno-client.js";
import { buildTestEnv, buildLiveTestEnv } from "../helpers/test-env.js";

describe("SunoClient", () => {
  // ---------------------------------------------------------------------------
  // 运行模式
  // ---------------------------------------------------------------------------
  describe("runtimeMode", () => {
    it("mock 模式下返回 mock", () => {
      const client = new SunoClient(buildTestEnv({ mockMode: true, sunoApiKey: "" }));
      expect(client.runtimeMode).toBe("mock");
    });

    it("未配置 apiKey 时自动降级为 mock", () => {
      const client = new SunoClient(buildTestEnv({ mockMode: false, sunoApiKey: "" }));
      expect(client.runtimeMode).toBe("mock");
    });

    it("live 模式且 apiKey 存在时返回 live", () => {
      const client = new SunoClient(buildTestEnv({ mockMode: false, sunoApiKey: "sk-xxx" }));
      expect(client.runtimeMode).toBe("live");
    });
  });

  // ---------------------------------------------------------------------------
  // callbackConfigured
  // ---------------------------------------------------------------------------
  describe("callbackConfigured", () => {
    it("callbackUrl 为空时返回 false", () => {
      const client = new SunoClient(buildTestEnv({ sunoCallbackUrl: "" }));
      expect(client.callbackConfigured).toBe(false);
    });

    it("callbackUrl 有值时返回 true", () => {
      const client = new SunoClient(buildTestEnv({ sunoCallbackUrl: "https://example.com/callback" }));
      expect(client.callbackConfigured).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // createMusic (mock 模式)
  // ---------------------------------------------------------------------------
  describe("createMusic", () => {
    it("mock 模式下返回 fake providerTaskId", async () => {
      const client = new SunoClient(buildTestEnv());
      const result = await client.createMusic({
        title: "测试歌曲",
        prompt: "测试提示词",
        stylePrompt: "mandopop-cinematic",
        mode: "quick",
        makeInstrumental: false,
        model: "V4_5ALL"
      });

      expect(result.providerTaskId).toMatch(/^suno_/);
      expect(result.raw).toEqual({ mode: "mock", payload: expect.any(Object) });
    });
  });

  // ---------------------------------------------------------------------------
  // getTaskDetails (mock 模式)
  // ---------------------------------------------------------------------------
  describe("getTaskDetails", () => {
    it("mock 模式下返回成功状态与示例音频", async () => {
      const client = new SunoClient(buildTestEnv());
      const details = await client.getTaskDetails("suno_test001", "fallback prompt");

      expect(details.status).toBe("succeeded");
      expect(details.audioUrl).toContain("soundhelix.com");
      expect(details.durationSeconds).toBe(132);
      expect(details.clips).toHaveLength(1);
      expect(details.clips[0].title).toBe("Mock Song A");
    });
  });

  // ---------------------------------------------------------------------------
  // getCredits (mock 模式)
  // ---------------------------------------------------------------------------
  describe("getCredits", () => {
    it("mock 模式下返回固定额度", async () => {
      const client = new SunoClient(buildTestEnv());
      const { creditsRemaining } = await client.getCredits();

      expect(creditsRemaining).toBe(128);
    });
  });

  // ---------------------------------------------------------------------------
  // buildQuickPayload
  // ---------------------------------------------------------------------------
  describe("buildQuickPayload", () => {
    it("使用 slug 风格时展开为完整描述", () => {
      const client = new SunoClient(buildTestEnv());
      const payload = client.buildQuickPayload({
        title: "一首歌",
        prompt: "春风十里",
        stylePrompt: "mandopop-cinematic",
        makeInstrumental: false,
        model: "V5"
      });

      expect(payload.stylePrompt).toContain("华语流行电影感");
      expect(payload.stylePrompt).toContain("78-96 BPM");
      expect(payload.stylePrompt).toContain("钢琴");
      expect(payload.title).toBe("一首歌");
    });

    it("未知风格名原样保留", () => {
      const client = new SunoClient(buildTestEnv());
      const payload = client.buildQuickPayload({
        title: "一首歌",
        prompt: "测试",
        stylePrompt: "custom unknown style",
        makeInstrumental: true,
        model: "V4"
      });

      expect(payload.stylePrompt).toBe("custom unknown style");
    });

    it("传递 negativeTags 和 vocalGender", () => {
      const client = new SunoClient(buildTestEnv());
      const payload = client.buildQuickPayload({
        title: "一首歌",
        prompt: "测试",
        stylePrompt: "electro-pop",
        makeInstrumental: false,
        model: "V4_5PLUS",
        negativeTags: "noise, harsh",
        vocalGender: "f"
      });

      expect(payload.negativeTags).toBe("noise, harsh");
      expect(payload.vocalGender).toBe("f");
    });
  });

  // ---------------------------------------------------------------------------
  // callbackUrl 回退逻辑
  // ---------------------------------------------------------------------------
  describe("callbackUrl", () => {
    it("未填写时使用 localhost 占位地址", () => {
      const client = new SunoClient(buildTestEnv({ sunoCallbackUrl: "", port: 8787 }));
      // 通过 callBackUrl 属性在 createMusic 中被使用。
      // 这里仅验证 callbackConfigured 为 false。
      expect(client.callbackConfigured).toBe(false);
    });
  });
});
