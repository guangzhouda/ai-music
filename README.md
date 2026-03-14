# AI Music Studio

基于 `Suno API` 的 AI 音乐生成工作台，面向桌面端使用，当前支持：

- 一键成歌
- 小说成歌
- 音乐库
- 任务中心
- 账户与余额查询
- 封面生成
- Suno / DeepSeek / 火山引擎运行时设置

项目已经提供可运行的前后端框架，支持 `mock` 与 `live` 两种模式。没有真实 Key 时也可以本地演示完整流程。

## 功能概览

### 一键成歌

- 输入标题和一句描述直接生成歌曲
- 支持选择模型、风格规则、纯音乐/人声、反向标签、人声性别
- 当前接口：`POST /api/generate/quick`

### 小说成歌

- 支持导入全文后做摘要、主题提取、角色提取
- 支持全文成歌、节选成歌、角色主题曲、场景配乐、风格重编
- 支持 `txt / md / docx / pdf` 导入
- 当前接口：
  - `POST /api/novels/import`
  - `POST /api/novels/import-file`
  - `POST /api/generate/novel`

### 音乐库

- 以封面卡片形式展示已生成歌曲
- 点击卡片进入桌面播放器
- 支持删除歌曲记录
- 当前接口：
  - `GET /api/songs`
  - `DELETE /api/songs/:songId`

### 任务中心

- 查看任务状态、providerTaskId、错误原因
- 手动查询任务状态
- 当前接口：
  - `GET /api/tasks`
  - `POST /api/tasks/:taskId/refresh`

### 账户与余额

- 查询 Suno credits
- 显示当前运行模式、回调开关与最近同步时间
- 当前接口：
  - `GET /api/account`

### 封面生成

- 歌曲与封面功能分离，封面单独维护
- 当前接口：
  - `POST /api/covers`

## 技术栈

### 前端

- React
- Vite
- TypeScript

### 后端

- Fastify
- TypeScript

### 模型与 Provider

- 音乐生成：Suno API
- 小说理解：DeepSeek
- 封面生成：火山引擎占位接入

## 目录结构

```text
apps/
  server/   Fastify 后端
  web/      React + Vite 前端
packages/
  config/   风格规则与应用配置
  types/    共享类型
  ui/       共享 UI 基础组件
doc/        外部 API 与系统设计文档
scripts/    文档导入与辅助脚本
```

## 本地启动

### 1. 安装依赖

```bash
npm install
```

如果你要启用 `docx / pdf` 导入，建议准备 Python 环境，并安装：

```bash
uv pip install --system python-docx pypdf
```

### 2. 配置环境变量

复制：

```bash
copy .env.example .env
```

或手动创建 `.env`。

### 3. 启动前后端

```bash
npm run dev
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8787`

### 4. 构建

```bash
npm run build
```

## 运行模式

### Mock 模式

```env
AI_MUSIC_MOCK_MODE=true
```

特点：

- 不需要真实 API Key
- 可以完整演示前后端流程
- 生成结果使用占位音频和占位封面

### Live 模式

```env
AI_MUSIC_MOCK_MODE=false
SUNO_API_KEY=
DEEPSEEK_API_KEY=
```

当前默认配置项：

```env
SUNO_API_BASE_URL=https://api.sunoapi.org
SUNO_GENERATE_PATH=/api/v1/generate
SUNO_DETAILS_PATH=/api/v1/generate/record-info
SUNO_CREDITS_PATH=/api/v1/generate/credit
SUNO_CALLBACK_URL=http://localhost:8787/api/providers/suno/callback

DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

注意：

- `localhost` 形式的 callback 对外部 provider 不可访问，只适合本地占位配置
- live 模式下建议优先依赖轮询，不要把本地 callback 当成真实可用公网回调

## Suno 参数支持

当前已接入的生成参数包括：

- `model`
- `style`
- `negativeTags`
- `vocalGender`
- `instrumental`

说明：

- UI 中选择的是风格规则，真正提交给 Suno 的是拼接后的风格描述文本
- Suno 的 `prompt` 在很多场景下会直接影响歌词或歌词草稿，因此当前项目把“内容提示词”和“风格提示词”分开组织

## 设置页

前端 `设置` 页面支持直接维护：

- Suno API Key / Base URL / Path
- DeepSeek API Key / Base URL / Model
- 火山引擎 Access Key / Secret Key / Region / Model
- Mock 模式开关

保存后的运行时配置会持久化到：

- `apps/server/data/settings.json`

## 文档

项目文档在 `doc/` 目录：

- [doc/suno-api-summary.md](./doc/suno-api-summary.md)
- [doc/volcengine-cover-api.md](./doc/volcengine-cover-api.md)
- [doc/music-style-rules.md](./doc/music-style-rules.md)
- [doc/novel-to-song-design.md](./doc/novel-to-song-design.md)
- [doc/system-architecture.md](./doc/system-architecture.md)

## 当前已知边界

- Suno live 任务在某些情况下会返回 `taskId` 但详情为空，需要继续做更稳的重试和失效处理
- 本地 callback 不是公网地址时，不能依赖回调更新状态
- 小说成歌当前仍以“LLM 理解 + 检索增强 + 提示词拼装”为主，不是完整歌词编辑器
- 当前存储仍是本地 JSON 快照，后续应迁移到真实数据库

## Git 仓库

远端仓库：

- `git@github.com:guangzhouda/ai-music.git`
