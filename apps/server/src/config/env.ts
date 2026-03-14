import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

const dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({
  path: path.resolve(dirname, "../../../../.env"),
  quiet: true
});

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
};

export const env = {
  port: Number(process.env.PORT ?? "8787"),
  mockMode: toBoolean(process.env.AI_MUSIC_MOCK_MODE, true),
  sunoApiKey: process.env.SUNO_API_KEY ?? "",
  sunoBaseUrl: process.env.SUNO_API_BASE_URL ?? "https://api.sunoapi.org",
  sunoGeneratePath: process.env.SUNO_GENERATE_PATH ?? "/api/v1/generate",
  sunoDetailsPath: process.env.SUNO_DETAILS_PATH ?? "/api/v1/generate/record-info",
  sunoCreditsPath: process.env.SUNO_CREDITS_PATH ?? "/api/v1/generate/credit",
  sunoCallbackUrl:
    process.env.SUNO_CALLBACK_URL ?? "http://localhost:8787/api/providers/suno/callback",
  volcengineAccessKey: process.env.VOLCENGINE_ACCESS_KEY ?? "",
  volcengineSecretKey: process.env.VOLCENGINE_SECRET_KEY ?? "",
  volcengineRegion: process.env.VOLCENGINE_REGION ?? "cn-north-1",
  volcengineImageModel: process.env.VOLCENGINE_IMAGE_MODEL ?? "dreamina-v3.1",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  deepseekBaseUrl: process.env.DEEPSEEK_API_BASE_URL ?? "https://api.deepseek.com",
  deepseekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-chat"
};

export type Env = typeof env;
