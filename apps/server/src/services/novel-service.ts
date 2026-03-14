import type { NovelCreateInput, NovelDocument, NovelPromptDraft } from "@ai-music/types";

import { genreRules } from "@ai-music/config";

import { updateSnapshot } from "../lib/file-db.js";
import { makeId, now } from "../lib/utils.js";
import {
  buildFallbackDocumentAnalysis,
  buildFallbackSongPlan,
  type DeepSeekClient
} from "../providers/deepseek-client.js";
import { buildChunks, retrieveRelevant } from "./knowledge-service.js";

export class NovelService {
  constructor(private readonly deepseekClient: DeepSeekClient) {}

  private resolveTitle(document: NovelDocument, input: NovelCreateInput, draftTitle: string) {
    const trimmed = draftTitle.trim();
    if (trimmed.length >= 2) {
      return trimmed;
    }

    const modeLabelMap: Record<NovelCreateInput["mode"], string> = {
      "novel-full": "全文成歌",
      "novel-excerpt": "节选成歌",
      "character-theme": "角色主题曲",
      "scene-score": "场景配乐",
      "style-remix": "风格重编"
    };

    return `${document.title} · ${modeLabelMap[input.mode]}${input.makeInstrumental ? " · 纯音乐" : ""}`;
  }

  async importNovel(title: string, text: string) {
    const id = makeId("doc");
    const createdAt = now();
    const chunks = buildChunks(id, text);
    const analysis = await this.deepseekClient
      .analyzeDocument(title, text)
      .catch(() => buildFallbackDocumentAnalysis(title, text));

    const document: NovelDocument = {
      id,
      title,
      text,
      summary: analysis.summary,
      keyThemes: analysis.keyThemes,
      characters: analysis.characters,
      createdAt,
      updatedAt: createdAt,
      chunks
    };

    await updateSnapshot((snapshot) => ({
      ...snapshot,
      documents: [document, ...snapshot.documents]
    }));

    return document;
  }

  async previewNovelSong(document: NovelDocument, input: NovelCreateInput): Promise<NovelPromptDraft> {
    const related = retrieveRelevant(document.chunks, `${input.focus}\n${input.excerpt ?? ""}`, 3)
      .map((item) => item.text)
      .join("\n");
    const styleRule =
      genreRules.find((rule) => rule.slug === input.stylePrompt) ??
      genreRules.find((rule) => rule.name === input.stylePrompt);
    const styleText = styleRule
      ? `${styleRule.name}，节奏 ${styleRule.bpmRange}，重点配器：${styleRule.instruments.join("、")}`
      : input.stylePrompt;

    return this.deepseekClient
      .composeNovelSongPlan({
        document,
        input,
        relatedText: related,
        styleText
      })
      .catch(() => buildFallbackSongPlan(document, input, related, styleText));
  }

  async composeNovelPrompt(document: NovelDocument, input: NovelCreateInput) {
    const draft = await this.previewNovelSong(document, input);

    return {
      title: this.resolveTitle(document, input, input.title?.trim() || draft.title),
      prompt: input.prompt?.trim() || draft.prompt,
      stylePrompt: input.stylePrompt.trim() || draft.stylePrompt
    };
  }
}
