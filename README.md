# AI Music Studio

桌面端 AI 音乐工作台，基于 `Suno API` 做歌曲生成，基于 `DeepSeek` 做小说理解、摘要和提示词草稿生成。

当前仓库已经包含：

- 前端工作台
- 后端 API
- Suno / DeepSeek / 火山引擎运行时配置
- 小说导入与知识索引
- 一键成歌
- 小说成歌
- 音乐库
- 任务中心
- 账户与余额同步
- DeepSeek 提示词资产库

远端仓库：

- `git@github.com:guangzhouda/ai-music.git`

## 功能列表

### 1. 一键成歌

- 输入标题和内容提示词，直接提交到 Suno
- 支持：
  - 模型选择
  - 风格规则
  - 纯音乐 / 人声
  - 反向标签 `negativeTags`
  - 人声性别 `vocalGender`

### 2. 小说成歌

- 支持导入整篇小说或长文
- 支持：
  - 全文成歌
  - 节选成歌
  - 角色主题曲
  - 场景配乐
  - 风格重编
- 导入后会调用 DeepSeek 做：
  - 全文摘要
  - 主题提取
  - 角色提取
  - 小说成歌提示词草稿生成
- 最终发给 Suno 的歌名、歌词/内容提示词、风格提示词都会暴露在前端，可人工修改

### 3. 音乐库

- 以封面卡片方式展示歌曲
- 点击卡片进入桌面播放器
- 一次 Suno 成功任务如果返回两首歌，音乐库会分别入库展示
- 支持删除单首歌曲

### 4. 任务中心

- 查看任务状态
- 查看 providerTaskId
- 查询最新状态
- 重试失败任务
- 删除失败任务
- 当前会把 Suno 的失败状态映射为本地失败，例如：
  - `CREATE_TASK_FAILED`
  - `GENERATE_AUDIO_FAILED`
  - `CALLBACK_EXCEPTION`
  - `SENSITIVE_WORD_ERROR`

### 5. 账户页

- 查询 Suno 剩余额度
- 查看当前运行模式
- 查看 callback 配置状态
- 手动同步余额

### 6. 封面生成

- 已从音乐库中拆出，单独页面维护
- 当前是火山引擎适配层

### 7. 提示词资产库

- 单独维护 DeepSeek 的系统提示词
- 当前内置 4 类资产：
  - 全文分析
  - 分段分析
  - 总览汇总
  - 小说成歌
- 修改后会影响：
  - 小说导入时的分析结果
  - 小说成歌草稿

## 页面说明

### 工作台

- 只保留入口、状态概览、最近歌曲、最近任务、最近文档

### 一键成歌

- 适合快速创建歌曲
- 直接填写内容提示词并提交给 Suno

### 小说成歌

- 先导入文本
- 再生成提示词草稿
- 最后人工修改并提交到 Suno

### 音乐库

- 第一层只显示歌名、封面、状态
- 第二层播放器显示歌词和音频播放控件

### 任务

- 查看失败原因和 providerTaskId
- 对失败任务做查询、重试、删除

### 账户

- 查看 credits、运行模式和 callback 状态

### 设置

- 在线维护：
  - Suno 配置
  - DeepSeek 配置
  - 火山引擎配置
  - Mock 模式
  - Callback 配置

### 资产库

- 修改发给 DeepSeek 的系统提示词

### 文档

- 查看仓库内文档目录说明和外部参考链接

## 技术栈

### 前端

- React
- React Router
- Vite
- TypeScript

### 后端

- Fastify
- TypeScript

### Provider

- 音乐生成：Suno API
- 小说理解：DeepSeek
- 封面生成：火山引擎占位适配

### 数据存储

- 当前使用本地 JSON 快照
- 主要数据文件在：
  - `apps/server/data/db.json`
  - `apps/server/data/settings.json`
  - `apps/server/data/prompt-assets.json`

## 目录结构

```text
apps/
  server/   Fastify 后端
  web/      React + Vite 前端
packages/
  config/   应用配置与音乐风格规则
  types/    前后端共享类型
  ui/       共享 UI 组件
doc/        API 摘要、规则和系统设计文档
scripts/    文件导入和辅助脚本
```

## 启动方式

### 1. 安装依赖

```bash
npm install
```

### 2. 准备环境变量

Windows:

```bash
copy .env.example .env
```

或者手动创建 `.env`。

### 3. 启动前后端

```bash
npm run dev
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8787`

### 4. 单独启动

只启动前端：

```bash
npm run dev:web
```

只启动后端：

```bash
npm run dev:server
```

### 5. 构建

```bash
npm run build
```

## 环境变量

参考文件：

- [.env.example](E:/Projects/ai-music/.env.example)

关键变量如下：

```env
SUNO_API_KEY=
SUNO_API_BASE_URL=https://api.sunoapi.org
SUNO_GENERATE_PATH=/api/v1/generate
SUNO_DETAILS_PATH=/api/v1/generate/record-info
SUNO_CREDITS_PATH=/api/v1/generate/credit
SUNO_CALLBACK_URL=

DEEPSEEK_API_KEY=
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

VOLCENGINE_ACCESS_KEY=
VOLCENGINE_SECRET_KEY=
VOLCENGINE_REGION=cn-north-1
VOLCENGINE_IMAGE_MODEL=dreamina-v3.1

AI_MUSIC_MOCK_MODE=true
VITE_API_BASE_URL=http://localhost:8787
```

## 运行模式

### Mock 模式

```env
AI_MUSIC_MOCK_MODE=true
```

特点：

- 不需要真实 Suno / DeepSeek Key
- 可以完整演示前后端流程
- 音乐和封面使用占位结果

### Live 模式

```env
AI_MUSIC_MOCK_MODE=false
SUNO_API_KEY=...
DEEPSEEK_API_KEY=...
```

特点：

- 歌曲生成请求会真实发给 Suno
- 小说分析与草稿生成会真实发给 DeepSeek
- 余额会读取 Suno 实时 credits

## 文件导入

小说成歌当前支持：

- `txt`
- `md`
- `docx`
- `pdf`

如果你要启用 `docx / pdf` 导入，建议准备 Python 环境，并安装：

```bash
uv pip install --system python-docx pypdf
```

## 使用方法

### 一键成歌

1. 打开 `一键成歌`
2. 填写标题
3. 填写提交给 Suno 的歌词/内容提示词
4. 选择模型、风格、是否纯音乐、人声性别、反向标签
5. 点击提交
6. 到 `任务` 或 `音乐库` 查看结果

### 小说成歌

1. 打开 `小说成歌`
2. 导入全文，或上传 `txt / md / docx / pdf`
3. 选择模式、风格、模型、纯音乐/人声
4. 点击 `先生成提示词草稿`
5. 人工修改：
   - 最终歌名
   - 最终提交给 Suno 的歌词/内容提示词
   - 最终提交给 Suno 的风格提示词
6. 点击 `提交到 Suno`
7. 到 `任务` 页查询状态

### 任务中心

- `查询状态`：立刻向 provider 查询详情
- `重试任务`：基于原始歌曲参数重建新任务
- `删除失败任务`：删除失败任务以及其对应歌曲记录

### 音乐库

- 成功任务如果返回两首歌，会分别展示
- 点击卡片进入播放器
- 点击卡片右上角删除单首歌

### 资产库

1. 打开 `资产库`
2. 修改对应系统提示词
3. 保存
4. 重新生成小说分析或小说成歌草稿

说明：

- 这里改的是发给 DeepSeek 的 `system prompt`
- 小说页里显示的“最终提交给 Suno 的提示词”不是同一层，它是 DeepSeek 生成后的结果

## Suno 接入说明

当前项目按 [docs.sunoapi.org](https://docs.sunoapi.org/) 对应接口实现，主要用到：

- 生成音乐
- 查询生成详情
- 查询余额
- 回调接口

当前已接入的参数：

- `prompt`
- `style`
- `title`
- `customMode`
- `instrumental`
- `model`
- `negativeTags`
- `vocalGender`
- `callBackUrl`

注意：

- 在 `customMode=true` 且 `instrumental=false` 时，`prompt` 会非常接近歌词输入
- 当前项目已经把提交给 Suno 的最终内容暴露在 UI 中，允许人工修改
- 一次成功任务，`record-info` 返回的 `response.sunoData[]` 可能包含两首歌，当前系统会分别入库

## Callback 行为

这个 provider 的生成接口实际要求 `callBackUrl`。

因此当前策略是：

- 如果设置页里填了公网 callback，就使用公网地址
- 如果留空，服务端会自动回退到本地占位地址：
  - `http://localhost:8787/api/providers/suno/callback`

说明：

- 本地占位地址只是为了满足 provider 参数要求
- 它并不适合真实公网回调
- 本地开发仍主要依赖轮询

## 提示词和敏感词

SunoAPI 当前对敏感词、艺人名的规则比较激进，甚至可能误伤中文词语的拼音片段。

建议：

- 不要写真实歌手名、艺人名、乐队名、品牌名
- 避免“模仿某歌手”“像某某一样唱”
- 尽量使用抽象描述，而不是指向现实人物
- 如果风格文案里出现容易被误判的词，可以改成更中性的表达

项目当前已经做了两层处理：

- DeepSeek 默认系统提示词中会要求规避艺人名和敏感词
- 小说成歌页会提醒你检查最终提交给 Suno 的内容提示词

## 已知边界

- Suno provider 有时会返回 `taskId`，但后续详情为空
- 某些 provider 失败状态不会直接扣费，余额变化要以实际账户页为准
- 敏感词检测可能出现误判
- 当前数据存储仍是本地 JSON，不适合生产环境

## 文档

仓库内正式文档在 `doc/`：

- [doc/suno-api-summary.md](E:/Projects/ai-music/doc/suno-api-summary.md)
- [doc/volcengine-cover-api.md](E:/Projects/ai-music/doc/volcengine-cover-api.md)
- [doc/music-style-rules.md](E:/Projects/ai-music/doc/music-style-rules.md)
- [doc/novel-to-song-design.md](E:/Projects/ai-music/doc/novel-to-song-design.md)
- [doc/system-architecture.md](E:/Projects/ai-music/doc/system-architecture.md)

## 开发说明

常用命令：

```bash
npm run dev
npm run dev:web
npm run dev:server
npm run build
npm run format
```

当前工作区是 `npm workspaces` 单仓结构，不需要分别手动联调依赖包。
