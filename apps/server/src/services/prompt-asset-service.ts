import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PromptAssetEntry, PromptAssetKey, PromptAssetLibrary } from "@ai-music/types";

import { now } from "../lib/utils.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(dirname, "../../data");
const promptAssetsPath = path.join(dataDir, "prompt-assets.json");

const defaultAssets: PromptAssetEntry[] = [
  {
    key: "document-analysis",
    title: "全文分析",
    description: "导入全文时使用。负责生成摘要、主题和角色列表。",
    targetModel: "deepseek",
    systemPrompt:
      "你是小说分析助手。请阅读全文并输出 JSON，对象字段固定为 summary、keyThemes、characters。summary 为中文摘要；keyThemes 和 characters 都是字符串数组。"
  },
  {
    key: "segment-analysis",
    title: "分段分析",
    description: "长文会先切段逐段分析，再进入总览汇总。",
    targetModel: "deepseek",
    systemPrompt:
      "你是小说分段分析助手。请输出 JSON，对象字段固定为 summary、keyThemes、characters。保持简洁，不要输出额外文字。"
  },
  {
    key: "summary-merge",
    title: "总览汇总",
    description: "把分段分析结果汇总成统一的全文摘要、主题和角色。",
    targetModel: "deepseek",
    systemPrompt:
      "你是小说总览分析助手。请基于分段笔记输出 JSON，对象字段固定为 summary、keyThemes、characters。summary 需要覆盖全文主线。"
  },
  {
    key: "novel-song-plan",
    title: "小说成歌",
    description: "把小说摘要、角色和节选整理成可直接交给 Suno 的歌名、歌词/内容提示词和风格提示词。",
    targetModel: "deepseek",
    systemPrompt:
      "你是小说音乐策划助手。请基于给定小说信息生成适合 Suno 的 JSON，对象字段固定为 title、prompt、stylePrompt。prompt 必须可直接用于音乐生成；如果 makeInstrumental=true，则明确要求纯音乐、无歌词、弱化人声。务必避免真实歌手名、艺人名、乐队名、品牌名、政治敏感词、违法违规和其他容易触发平台审核的表达；如原始内容中出现相关元素，请改写成中性、虚构、抽象的表达。"
  }
];

const legacySystemPrompts: Partial<Record<PromptAssetKey, string>> = {
  "novel-song-plan":
    "你是小说音乐策划助手。请基于给定小说信息生成适合 Suno 的 JSON，对象字段固定为 title、prompt、stylePrompt。prompt 必须可直接用于音乐生成；如果 makeInstrumental=true，则明确要求纯音乐、无歌词、弱化人声。"
};

async function ensurePromptAssetDir() {
  await mkdir(dataDir, { recursive: true });
}

async function writePromptAssets(library: PromptAssetLibrary) {
  await ensurePromptAssetDir();
  await writeFile(promptAssetsPath, JSON.stringify(library, null, 2), "utf8");
}

function mergeAssets(input: Partial<PromptAssetLibrary> | null | undefined): PromptAssetLibrary {
  const nextAssets = defaultAssets.map((asset) => {
    const override = input?.assets?.find((entry) => entry.key === asset.key);
    const nextPrompt =
      !override?.systemPrompt?.trim() ||
      override.systemPrompt.trim() === legacySystemPrompts[asset.key]
        ? asset.systemPrompt
        : override.systemPrompt.trim();

    return {
      ...asset,
      systemPrompt: nextPrompt
    };
  });

  return {
    updatedAt: input?.updatedAt ?? null,
    assets: nextAssets
  };
}

export async function getPromptAssetLibrary(): Promise<PromptAssetLibrary> {
  await ensurePromptAssetDir();

  try {
    const content = await readFile(promptAssetsPath, "utf8");
    return mergeAssets(JSON.parse(content) as PromptAssetLibrary);
  } catch {
    const fallback = mergeAssets(null);
    await writePromptAssets(fallback);
    return fallback;
  }
}

export async function savePromptAssetLibrary(input: PromptAssetLibrary) {
  const normalized = mergeAssets({
    ...input,
    updatedAt: now()
  });
  await writePromptAssets(normalized);
  return normalized;
}

export async function getPromptAssetMap() {
  const library = await getPromptAssetLibrary();

  return library.assets.reduce<Record<PromptAssetKey, PromptAssetEntry>>((result, asset) => {
    result[asset.key] = asset;
    return result;
  }, {} as Record<PromptAssetKey, PromptAssetEntry>);
}
