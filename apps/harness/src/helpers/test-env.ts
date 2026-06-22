import type { Env } from "../../../server/src/config/env.js";

/**
 * 构造一份纯 mock 的 Env 配置，所有外部依赖关闭。
 * 用于 Provider、Service、Route 测试。
 */
export function buildTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    port: 0, // 测试时不占用端口
    mockMode: true,
    sunoApiKey: "",
    sunoBaseUrl: "https://api.sunoapi.org",
    sunoGeneratePath: "/api/v1/generate",
    sunoDetailsPath: "/api/v1/generate/record-info",
    sunoCreditsPath: "/api/v1/generate/credit",
    sunoCallbackUrl: "",
    volcengineAccessKey: "",
    volcengineSecretKey: "",
    volcengineRegion: "cn-north-1",
    volcengineImageModel: "dreamina-v3.1",
    deepseekApiKey: "",
    deepseekBaseUrl: "https://api.deepseek.com",
    deepseekModel: "deepseek-chat",
    ...overrides
  };
}

/**
 * 构造一份 live 模式配置，模拟有真实 Key 的环境。
 * 仅用于 Provider 契约测试中验证请求体格式，不会真实发请求。
 */
export function buildLiveTestEnv(overrides: Partial<Env> = {}): Env {
  return buildTestEnv({
    mockMode: false,
    sunoApiKey: "sk-test-suno-key-12345",
    deepseekApiKey: "sk-test-deepseek-key-67890",
    volcengineAccessKey: "ak-test-volc",
    volcengineSecretKey: "sk-test-volc",
    ...overrides
  });
}
