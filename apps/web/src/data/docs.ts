export interface DocItem {
  id: string;
  category: string;
  title: string;
  description: string;
  href: string;
}

export const docsCatalog: DocItem[] = [
  {
    id: "suno",
    category: "API",
    title: "Suno API 摘要",
    description: "整理生成、状态查询、余额和回调的工程映射方式。",
    href: "https://docs.sunoapi.org/"
  },
  {
    id: "cover",
    category: "Provider",
    title: "火山引擎封面生成",
    description: "说明封面生成在当前项目里的 provider 封装与接入边界。",
    href: "https://www.volcengine.com/docs/508/1364449"
  },
  {
    id: "style",
    category: "Rules",
    title: "音乐风格规则",
    description: "整理流行、国风、电子、摇滚等风格的节奏、配器和编排规则。",
    href: "https://support.spotify.com/us/artists/article/loudness-normalization/"
  },
  {
    id: "novel",
    category: "Design",
    title: "小说成歌方案",
    description: "说明全文导入、切块检索、角色与场景模式的提示词构造方式。",
    href: "#"
  },
  {
    id: "architecture",
    category: "System",
    title: "系统架构",
    description: "概览前后端模块、Provider、任务状态机和数据流。",
    href: "#"
  }
];
