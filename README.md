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
- 先生成“提交给 Suno 的提示词草稿”，再人工修改后提交
- 当前接口：
  - `POST /api/novels/import`
  - `POST /api/novels/import-file`
  - `POST /api/generate/novel/preview`
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
- 支持重试失败任务
- 支持删除失败任务
- 当前接口：
  - `GET /api/tasks`
  - `POST /api/tasks/:taskId/refresh`
  - `POST /api/tasks/:taskId/retry`
  - `DELETE /api/tasks/:taskId`

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
SUNO_CALLBACK_URL=

DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

注意：

- 项目现在默认关闭 callback，本地开发只走轮询
- 只有公网可访问地址才适合填到 `SUNO_CALLBACK_URL`
- `localhost` 形式的 callback 对外部 provider 不可访问，不应作为 live 回调地址

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
- 小说成歌页面会先请求 LLM 生成草稿，再把最终提示词暴露给用户编辑

## 设置页

前端 `设置` 页面支持直接维护：

- Suno API Key / Base URL / Path
- DeepSeek API Key / Base URL / Model
- 火山引擎 Access Key / Secret Key / Region / Model
- Mock 模式开关
- Suno callback 开关与公网回调地址

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
- 本地 callback 默认关闭，live 模式下如果要启用回调，必须提供公网 URL
- 小说成歌当前仍以“LLM 理解 + 检索增强 + 提示词拼装”为主，不是完整歌词编辑器
- 当前存储仍是本地 JSON 快照，后续应迁移到真实数据库

## 使用说明

### 一键成歌

1. 打开 `一键成歌`
2. 填写标题
3. 在“提交给 Suno 的歌词/内容提示词”中输入歌曲内容
4. 选择风格规则、模型、人声性别、反向标签、是否纯音乐
5. 点击“提交 Suno 任务”

### 小说成歌

1. 在“导入全文”中粘贴正文，或上传 `txt / md / docx / pdf`
2. 在“已导入文档”里选择当前要使用的小说
3. 选择模式、风格、模型、纯音乐/人声、节选内容等参数
4. 点击“先生成提示词草稿”
5. 在下方直接修改：
   - 最终歌名
   - 最终提交给 Suno 的歌词/内容提示词
   - 最终提交给 Suno 的风格提示词
6. 点击“提交到 Suno”

### 音乐库

1. 打开 `音乐库`
2. 第一层只看歌名和状态
3. 点击卡片进入桌面播放器
4. 需要清理歌曲时，直接点卡片右上角“删除”

### 任务中心

1. `查询状态`：立即轮询 provider 结果
2. `重试任务`：仅对失败任务可用，会基于原始提示词重新创建新任务
3. `删除失败任务`：移除失败任务及其对应歌曲记录

## Git 仓库

远端仓库：

- `git@github.com:guangzhouda/ai-music.git`
