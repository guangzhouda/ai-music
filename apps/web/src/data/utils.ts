import type { GenreRule } from "@ai-music/types";

export function toReadableErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (Array.isArray(value) && value.length > 0) return toReadableErrorMessage(value[0]);
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if ("message" in value && typeof value.message === "string") return value.message;
    if ("error" in value && typeof value.error === "string") return value.error;
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value ?? "未知错误");
}

export function buildStyleText(rules: GenreRule[], styleRuleSlug: string, customNotes: string): string {
  const rule = rules.find((r) => r.slug === styleRuleSlug) ?? rules[0];
  if (!rule) return customNotes.trim();
  const segments = [
    `${rule.name}，节奏 ${rule.bpmRange}`,
    `重点配器：${rule.instruments.join("、")}`,
    `编曲说明：${rule.arrangementNotes.join("；")}`
  ];
  if (customNotes.trim()) segments.push(`额外要求：${customNotes.trim()}`);
  return segments.join("，");
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "草稿", generating: "生成中", ready: "可播放", failed: "失败",
    queued: "排队中", running: "处理中", succeeded: "已完成"
  };
  return map[status] ?? status;
}
