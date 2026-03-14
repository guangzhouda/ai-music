# 系统架构说明

## 1. 仓库结构

```text
apps/
  server/   Fastify 后端
  web/      React + Vite 前端
packages/
  config/   风格规则与应用配置
  types/    共享类型
  ui/       共享 UI 基础组件
doc/        API 摘要与项目设计文档
```

## 2. 前端架构

技术选择：

- React 19
- Vite 7
- React Router
- 自定义 CSS 视觉系统

页面：

- `/` 工作台
- `/quick` 一键成歌
- `/novel` 小说成歌
- `/library` 音乐库
- `/tasks` 任务中心
- `/account` 账户中心

## 3. 后端架构

技术选择：

- Fastify
- TypeScript
- 文件持久化 JSON
- Provider Adapter 模式

模块：

- `SunoClient`
- `VolcengineCoverClient`
- `TaskService`
- `NovelService`
- `KnowledgeService`

## 4. 数据流

### 4.1 一键成歌

1. 前端提交表单
2. 后端创建歌曲记录
3. 后端创建任务记录
4. 调用 `SunoClient.createMusic`
5. 写入 `providerTaskId`
6. 通过轮询或回调更新结果

### 4.2 小说成歌

1. 导入全文
2. 构建 chunk
3. 生成摘要与关键词
4. 根据模式检索相关 chunk
5. 拼装结构化 prompt
6. 提交 Suno 任务
7. 保存歌曲到音乐库

### 4.3 封面生成

1. 选择歌曲
2. 提交封面描述
3. 后端调用封面 provider
4. 回写 `coverUrl`

## 5. 状态机

任务状态：

- `queued`
- `running`
- `succeeded`
- `failed`

歌曲状态：

- `generating`
- `ready`
- `failed`

封面状态：

- `idle`
- `generating`
- `ready`
- `failed`

## 6. 为什么当前首版使用 JSON 持久化

为了先交付一个完整可跑的框架，而不是把第一阶段卡死在数据库与消息队列环境上。  
这允许你在本地直接运行完整链路：

- 页面
- 接口
- 任务记录
- 小说导入
- 音乐库
- 封面生成

## 7. 下一阶段推荐升级

### 数据层

- PostgreSQL
- `pgvector`

### 队列

- Redis
- BullMQ

### 向量模型

- Embedding API
- 本地中文向量模型

### 存储

- MinIO / S3
- OSS

### 鉴权

- 用户体系
- 多租户 Key 管理

