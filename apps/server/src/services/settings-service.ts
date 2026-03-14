import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AppSettings } from "@ai-music/types";

import type { Env } from "../config/env.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(dirname, "../../data");
const settingsPath = path.join(dataDir, "settings.json");

export function getSettingsSnapshot(config: Env): AppSettings {
  return {
    mockMode: config.mockMode,
    sunoApiKey: config.sunoApiKey,
    sunoBaseUrl: config.sunoBaseUrl,
    sunoGeneratePath: config.sunoGeneratePath,
    sunoDetailsPath: config.sunoDetailsPath,
    sunoCreditsPath: config.sunoCreditsPath,
    sunoCallbackUrl: config.sunoCallbackUrl,
    deepseekApiKey: config.deepseekApiKey,
    deepseekBaseUrl: config.deepseekBaseUrl,
    deepseekModel: config.deepseekModel,
    volcengineAccessKey: config.volcengineAccessKey,
    volcengineSecretKey: config.volcengineSecretKey,
    volcengineRegion: config.volcengineRegion,
    volcengineImageModel: config.volcengineImageModel
  };
}

async function ensureSettingsDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readPersistedSettings(): Promise<Partial<AppSettings>> {
  await ensureSettingsDir();

  try {
    const content = await readFile(settingsPath, "utf8");
    return JSON.parse(content) as Partial<AppSettings>;
  } catch {
    return {};
  }
}

async function writePersistedSettings(settings: AppSettings) {
  await ensureSettingsDir();
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

export async function hydrateRuntimeSettings(config: Env) {
  const persisted = await readPersistedSettings();
  applySettings(config, persisted);
}

export async function saveRuntimeSettings(config: Env, next: AppSettings) {
  applySettings(config, next);
  await writePersistedSettings(getSettingsSnapshot(config));
  return getSettingsSnapshot(config);
}

function applySettings(config: Env, input: Partial<AppSettings>) {
  if (typeof input.mockMode === "boolean") {
    config.mockMode = input.mockMode;
  }

  if (typeof input.sunoApiKey === "string") {
    config.sunoApiKey = input.sunoApiKey.trim();
  }
  if (typeof input.sunoBaseUrl === "string") {
    config.sunoBaseUrl = input.sunoBaseUrl.trim();
  }
  if (typeof input.sunoGeneratePath === "string") {
    config.sunoGeneratePath = input.sunoGeneratePath.trim();
  }
  if (typeof input.sunoDetailsPath === "string") {
    config.sunoDetailsPath = input.sunoDetailsPath.trim();
  }
  if (typeof input.sunoCreditsPath === "string") {
    config.sunoCreditsPath = input.sunoCreditsPath.trim();
  }
  if (typeof input.sunoCallbackUrl === "string") {
    config.sunoCallbackUrl = input.sunoCallbackUrl.trim();
  }

  if (typeof input.deepseekApiKey === "string") {
    config.deepseekApiKey = input.deepseekApiKey.trim();
  }
  if (typeof input.deepseekBaseUrl === "string") {
    config.deepseekBaseUrl = input.deepseekBaseUrl.trim();
  }
  if (typeof input.deepseekModel === "string") {
    config.deepseekModel = input.deepseekModel.trim();
  }

  if (typeof input.volcengineAccessKey === "string") {
    config.volcengineAccessKey = input.volcengineAccessKey.trim();
  }
  if (typeof input.volcengineSecretKey === "string") {
    config.volcengineSecretKey = input.volcengineSecretKey.trim();
  }
  if (typeof input.volcengineRegion === "string") {
    config.volcengineRegion = input.volcengineRegion.trim();
  }
  if (typeof input.volcengineImageModel === "string") {
    config.volcengineImageModel = input.volcengineImageModel.trim();
  }
}
