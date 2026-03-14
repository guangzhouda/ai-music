import type { GenreRule } from "@ai-music/types";

export const appMeta = {
  name: "AI Music Studio",
  tagline: "Suno 驱动的小说成歌与一键成歌工作台"
};

export const genreRules: GenreRule[] = [
  {
    slug: "mandopop-cinematic",
    name: "华语流行电影感",
    bpmRange: "78-96 BPM",
    mood: ["抒情", "宽银幕", "叙事推进"],
    instruments: ["钢琴", "弦乐 Pad", "鼓组", "低频合成器"],
    arrangementNotes: [
      "主歌保持留白，副歌补充宽阔和声",
      "桥段提升鼓组密度，制造情绪抬升",
      "人声旋律优先，避免配器覆盖歌词叙事"
    ]
  },
  {
    slug: "guofeng-ballad",
    name: "国风抒情",
    bpmRange: "70-88 BPM",
    mood: ["古风", "宿命感", "婉转"],
    instruments: ["古筝", "箫", "弦乐", "中国鼓"],
    arrangementNotes: [
      "前奏用民族乐器建立空间识别",
      "副歌保留现代节拍，避免整体过散",
      "歌词意象优先使用场景与角色关系"
    ]
  },
  {
    slug: "electro-pop",
    name: "电子流行",
    bpmRange: "100-124 BPM",
    mood: ["明亮", "都市感", "速度感"],
    instruments: ["合成器 Lead", "Sidechain Pad", "808/House Kick", "Vocal Chop"],
    arrangementNotes: [
      "Drop 前需要足够的 build-up 与滤波过渡",
      "低频与主唱频段错位，控制拥挤",
      "Hook 需要高度重复和短句记忆点"
    ]
  },
  {
    slug: "rock-anthem",
    name: "摇滚主题曲",
    bpmRange: "110-148 BPM",
    mood: ["热血", "反抗", "群像"],
    instruments: ["失真吉他", "Bass", "真实鼓组", "群唱和声"],
    arrangementNotes: [
      "副歌必须明确强化节奏型",
      "吉他墙与人声主旋律需做频段分工",
      "尾奏可延展主题动机强化记忆"
    ]
  }
];

export const dashboardHighlights = [
  "一键成歌：简短描述直接生成歌曲",
  "小说成歌：全文、节选、角色、场景多模式生成",
  "音乐库：统一查看音频、封面、任务状态与标签",
  "封面生成：基于火山引擎模型生成视觉封面"
];

