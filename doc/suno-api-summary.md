# Suno API 文档摘要

本文档基于你指定的第三方文档站 [docs.sunoapi.org](https://docs.sunoapi.org/) 整理，目标是为本项目提供一个可接入的工程摘要，而不是替代原始文档。

## 1. 文档范围

本项目当前重点使用以下页面：

- [Generate Music](https://docs.sunoapi.org/suno-api/generate-music)
- [Get Music Generation Details](https://docs.sunoapi.org/suno-api/get-music-generation-details)
- [Get Remaining Credits](https://docs.sunoapi.org/suno-api/get-remaining-credits)
- [Music Generation Callbacks](https://docs.sunoapi.org/suno-api/generate-music-callbacks)

## 2. 接入定位

当前文档站更适合作为 `Suno` 的第三方接入层，而不是 Suno 官方开发者平台。  
这意味着工程上必须把它视为一个 `provider adapter`：

- 业务层不直接依赖特定字段名
- 回调与轮询统一走任务状态机
- API 路径、鉴权方式、字段名都通过配置注入
- 后续如果切换到其他 Suno 代理或官方接入方式，业务层不需要重写

## 3. 当前项目使用到的能力

### 3.1 生成音乐

用途：

- 一键成歌
- 小说成歌
- 风格重编

工程侧统一抽象为：

- 输入：`title`、`prompt`、`stylePrompt`、`makeInstrumental`
- 输出：`providerTaskId`

本项目默认按如下参数映射：

- `title`：歌曲标题
- `prompt`：歌曲主提示词
- `tags` 或等价字段：风格、乐器、情绪标签
- `instrumental`：是否纯音乐
- `callBackUrl`：生成完成后回调地址

文档页面表明生成接口支持：

- 自定义模式
- 标题
- 提示词
- 标签/风格标签
- 纯音乐开关
- 回调地址

## 4. 任务查询

生成并不是同步返回完整歌曲，而是返回任务标识。  
因此本项目在后端统一使用两种方式更新状态：

- 主动轮询：通过 `providerTaskId` 查询详情
- 被动回调：Suno 任务完成时推送结果

任务查询统一映射为以下内部状态：

- `queued`
- `running`
- `succeeded`
- `failed`

内部歌曲状态映射为：

- `generating`
- `ready`
- `failed`

## 5. 余额查询

文档站提供 `credits` 相关接口，用于查询剩余额度。  
本项目前端账户页会调用后端 `/api/account`，由后端统一去查询 provider credits，并写入本地账户快照。

工程落地建议：

- 不在前端直接请求第三方 credits
- 由后端统一管理 API Key
- 将最近同步时间一并落库，避免频繁请求 provider

## 6. 回调处理

回调用于减少前端轮询压力，也是后续真实部署时最推荐的状态同步方式。

本项目约定回调入口：

- `/api/providers/suno/callback`

回调处理原则：

- 只以 `providerTaskId` 关联内部任务
- 不直接信任外部 payload 中的业务数据
- 只更新任务状态、音频地址、时长和必要提示词片段
- 所有回调写入统一任务状态机

## 7. 本项目中的字段映射

### 7.1 外部到内部

- `taskId` / `id` / `data` 中可用标识 -> `providerTaskId`
- 生成状态 -> `SongTask.status`
- 音频地址 -> `Song.audioUrl`
- 歌词/提示词片段 -> `Song.lyricsSnippet`
- 时长 -> `Song.durationSeconds`

### 7.2 内部到外部

- 一键成歌表单 -> 生成接口参数
- 小说成歌提示词 -> 生成接口参数
- UI 中的风格选择 -> `tags` 或风格字段

## 8. 风险与注意事项

### 8.1 这不是官方稳定 SDK

由于当前依赖的是第三方文档和转接 API，需预留以下风险：

- 字段命名变化
- 路径变化
- 配额与速率限制变化
- 回调数据结构变化
- 代理服务可用性变化

### 8.2 所以本项目做了这些保护

- `SunoClient` 独立封装
- 基础路径和 endpoint path 通过环境变量配置
- Mock / Live 两种模式
- 状态机独立于 provider

## 9. 推荐的环境变量

建议保留以下配置：

```env
SUNO_API_KEY=
SUNO_API_BASE_URL=https://api.sunoapi.org
SUNO_GENERATE_PATH=/api/v1/generate
SUNO_DETAILS_PATH=/api/v1/generate/record-info
SUNO_CREDITS_PATH=/api/v1/generate/credits
SUNO_CALLBACK_URL=http://localhost:8787/api/providers/suno/callback
AI_MUSIC_MOCK_MODE=true
```

说明：

- 如果第三方文档更新了路径，只改环境变量即可
- 本地默认 `mock`，避免在没有 Key 时阻塞开发

## 10. 对本项目的直接结论

当前第一版已经适合这样接入：

1. 后端提交生成任务
2. 持久化内部任务和歌曲记录
3. 通过轮询或回调更新状态
4. 在账户页展示 credits

后续如果你拿到真实可用的生产 Key，只需要重点核对：

- 真实生成接口路径
- 真实详情查询路径
- Bearer Token 或其他鉴权头
- 回调签名校验方式

## 参考链接

- [Suno API Documentation](https://docs.sunoapi.org/)
- [Generate Music](https://docs.sunoapi.org/suno-api/generate-music)
- [Get Music Generation Details](https://docs.sunoapi.org/suno-api/get-music-generation-details)
- [Get Remaining Credits](https://docs.sunoapi.org/suno-api/get-remaining-credits)
- [Music Generation Callbacks](https://docs.sunoapi.org/suno-api/generate-music-callbacks)

