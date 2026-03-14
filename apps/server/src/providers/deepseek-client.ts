import type { NovelCreateInput, NovelDocument } from "@ai-music/types";

import type { Env } from "../config/env.js";
import { extractKeywords, summarizeText } from "../services/knowledge-service.js";

export interface DocumentAnalysis {
  summary: string;
  keyThemes: string[];
  characters: string[];
}

export interface SongPlan {
  title: string;
  prompt: string;
  stylePrompt: string;
}

function clip(text: string, limit: number) {
  return text.length <= limit ? text : `${text.slice(0, limit)}...`;
}

function splitLongText(text: string, limit = 12000) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const segments: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > limit && current) {
      segments.push(current);
      current = paragraph;
    } else {
      current = next;
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments.length ? segments : [text];
}

function parseJsonPayload<T>(content: string): T {
  const raw = content.trim();

  try {
    return JSON.parse(raw) as T;
  } catch {
    const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? raw.match(/```([\s\S]*?)```/i)?.[1];
    if (fenced) {
      return JSON.parse(fenced.trim()) as T;
    }

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1)) as T;
    }

    throw new Error("DeepSeek returned invalid JSON");
  }
}

export function buildFallbackDocumentAnalysis(title: string, text: string): DocumentAnalysis {
  const keywords = extractKeywords(text, 10);
  return {
    summary: summarizeText(text),
    keyThemes: keywords.slice(0, 6),
    characters: keywords.slice(0, 8).length ? keywords.slice(0, 8) : [title]
  };
}

export function buildFallbackSongPlan(
  document: NovelDocument,
  input: NovelCreateInput,
  relatedText: string,
  styleText: string
): SongPlan {
  const modeLabelMap: Record<NovelCreateInput["mode"], string> = {
    "novel-full": "全文成歌",
    "novel-excerpt": "节选成歌",
    "character-theme": "角色主题曲",
    "scene-score": "场景配乐",
    "style-remix": "风格重编"
  };

  return {
    title: `${document.title} · ${modeLabelMap[input.mode]}${input.makeInstrumental ? " · 纯音乐" : ""}`,
    prompt: [
      `请围绕小说《${document.title}》创作${input.makeInstrumental ? "纯音乐" : "歌曲"}。`,
      `模式：${modeLabelMap[input.mode]}。`,
      `聚焦内容：${input.focus}。`,
      `摘要：${document.summary}`,
      `关键词：${document.keyThemes.join("、")}`,
      `角色线索：${document.characters.slice(0, 5).join("、") || "待补充"}`,
      `参考内容：${clip(relatedText || document.summary, 800)}`,
      input.makeInstrumental
        ? "要求：仅输出纯音乐构思，不要写歌词，不要强调人声演唱。"
        : "要求：保留人声主旋律和可记忆的副歌 Hook。"
    ].join("\n"),
    stylePrompt: styleText
  };
}

export class DeepSeekClient {
  constructor(private readonly config: Env) {}

  get runtimeMode() {
    return this.config.mockMode || !this.config.deepseekApiKey ? "mock" : "live";
  }

  async analyzeDocument(title: string, text: string): Promise<DocumentAnalysis> {
    if (this.runtimeMode === "mock") {
      return buildFallbackDocumentAnalysis(title, text);
    }

    const segments = splitLongText(text, 12000).slice(0, 8);

    if (segments.length === 1) {
      return this.requestJson<DocumentAnalysis>({
        system:
          "你是小说分析助手。请阅读全文并输出 JSON，对象字段固定为 summary、keyThemes、characters。summary 为中文摘要；keyThemes 和 characters 都是字符串数组。",
        user: `标题：${title}\n\n正文：\n${segments[0]}`
      });
    }

    const segmentNotes: string[] = [];
    for (let index = 0; index < segments.length; index += 1) {
      const note = await this.requestJson<{
        summary: string;
        keyThemes: string[];
        characters: string[];
      }>({
        system:
          "你是小说分段分析助手。请输出 JSON，对象字段固定为 summary、keyThemes、characters。保持简洁，不要输出额外文字。",
        user: `标题：${title}\n\n这是第 ${index + 1}/${segments.length} 段正文：\n${segments[index]}`
      });
      segmentNotes.push(
        [
          `段落 ${index + 1} 摘要：${note.summary}`,
          `主题：${note.keyThemes.join("、")}`,
          `角色：${note.characters.join("、")}`
        ].join("\n")
      );
    }

    return this.requestJson<DocumentAnalysis>({
      system:
        "你是小说总览分析助手。请基于分段笔记输出 JSON，对象字段固定为 summary、keyThemes、characters。summary 需要覆盖全文主线。",
      user: `标题：${title}\n\n分段笔记：\n${segmentNotes.join("\n\n")}`
    });
  }

  async composeNovelSongPlan(params: {
    document: NovelDocument;
    input: NovelCreateInput;
    relatedText: string;
    styleText: string;
  }): Promise<SongPlan> {
    if (this.runtimeMode === "mock") {
      return buildFallbackSongPlan(params.document, params.input, params.relatedText, params.styleText);
    }

    const modeTextMap: Record<NovelCreateInput["mode"], string> = {
      "novel-full": "全文成歌",
      "novel-excerpt": "节选成歌",
      "character-theme": "角色主题曲",
      "scene-score": "场景配乐",
      "style-remix": "风格重编"
    };

    return this.requestJson<SongPlan>({
      system:
        "你是小说音乐策划助手。请基于给定小说信息生成适合 Suno 的 JSON，对象字段固定为 title、prompt、stylePrompt。prompt 必须可直接用于音乐生成；如果 makeInstrumental=true，则明确要求纯音乐、无歌词、弱化人声。",
      user: [
        `标题：${params.document.title}`,
        `模式：${modeTextMap[params.input.mode]}`,
        `是否纯音乐：${params.input.makeInstrumental ? "是" : "否"}`,
        `聚焦内容：${params.input.focus}`,
        `风格规则：${params.styleText}`,
        `全文摘要：${params.document.summary}`,
        `主题关键词：${params.document.keyThemes.join("、")}`,
        `角色：${params.document.characters.join("、")}`,
        `相关正文：${clip(params.relatedText || params.document.summary, 1800)}`,
        params.input.excerpt ? `额外节选：${clip(params.input.excerpt, 1200)}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    });
  }

  private async requestJson<T>(input: { system: string; user: string }): Promise<T> {
    const response = await fetch(`${this.config.deepseekBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.deepseekApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.config.deepseekModel,
        response_format: {
          type: "json_object"
        },
        messages: [
          {
            role: "system",
            content: input.system
          },
          {
            role: "user",
            content: input.user
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API failed: ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, any>;
    const content = String(payload?.choices?.[0]?.message?.content ?? "");

    return parseJsonPayload<T>(content);
  }
}
