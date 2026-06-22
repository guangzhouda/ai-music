import type { SunoModel, VocalGender } from "@ai-music/types";

export interface NavItem {
  path: string;
  label: string;
}

export const navItems: NavItem[] = [
  ["/", "工作台"],
  ["/quick", "一键成歌"],
  ["/novel", "小说成歌"],
  ["/library", "音乐库"],
  ["/tasks", "任务"],
  ["/account", "账户"],
  ["/settings", "设置"]
].map(([path, label]) => ({ path, label }));

/** 二级入口（不在主导航中显示，通过页面内链接访问） */
export const secondaryItems: NavItem[] = [
  { path: "/cover", label: "封面生成" },
  { path: "/assets", label: "提示词资产库" },
  { path: "/docs", label: "文档" }
];

export interface Option<T = string> {
  value: T;
  label: string;
}

export const sunoModelOptions: Option<SunoModel>[] = [
  { value: "V4", label: "V4" },
  { value: "V4_5", label: "V4.5" },
  { value: "V4_5PLUS", label: "V4.5+" },
  { value: "V4_5ALL", label: "V4.5 All" },
  { value: "V5", label: "V5" }
];

export const vocalGenderOptions: Option<VocalGender>[] = [
  { value: "", label: "自动" },
  { value: "f", label: "女声" },
  { value: "m", label: "男声" }
];

export const novelModeOptions: Option[] = [
  ["novel-full", "全文成歌"],
  ["novel-excerpt", "节选成歌"],
  ["character-theme", "角色主题曲"],
  ["scene-score", "场景配乐"],
  ["style-remix", "风格重编"]
].map(([value, label]) => ({ value, label }));

export const novelModeLabelMap: Record<string, string> = {
  "novel-full": "全文成歌",
  "novel-excerpt": "节选成歌",
  "character-theme": "角色主题曲",
  "scene-score": "场景配乐",
  "style-remix": "风格重编"
};

export function getNovelModeLabel(mode: string) {
  return novelModeLabelMap[mode] ?? "小说成歌";
}

import type { SongTask, Song } from "@ai-music/types";

export const taskStatusTextMap: Record<SongTask["status"], string> = {
  queued: "排队中",
  running: "处理中",
  succeeded: "已完成",
  failed: "失败"
};

export const songStatusTextMap: Record<Song["status"], string> = {
  draft: "草稿",
  generating: "生成中",
  ready: "可播放",
  failed: "失败"
};

export function songStatusLabel(status: Song["status"]) {
  return songStatusTextMap[status] ?? status;
}

export function taskStatusLabel(status: SongTask["status"]) {
  return taskStatusTextMap[status] ?? status;
}
