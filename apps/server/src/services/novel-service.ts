import type { NovelCreateInput, NovelDocument } from "@ai-music/types";

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

  async composeNovelPrompt(document: NovelDocument, input: NovelCreateInput) {
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
}
