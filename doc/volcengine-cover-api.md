# 火山引擎封面生成接入说明

本文档用于说明本项目中“歌曲封面生成”模块的接入思路。当前目标是先把后端能力和前端工作流搭好，再把火山引擎真实鉴权与模型参数补齐。

## 1. 使用目的

为已生成歌曲补充封面图，形成完整的音乐资产：

- 歌曲标题
- 音频地址
- 风格标签
- 封面图

## 2. 供应商定位

本项目选择火山引擎的图像生成能力作为封面生成 provider。  
工程侧采用 `VolcengineCoverClient` 封装，避免把鉴权、模型和请求结构散落到业务代码里。

## 3. 当前框架设计

后端入口：

- `POST /api/covers`

输入：

```json
{
  "songId": "song_xxx",
  "prompt": "电影感夜景封面，霓虹、雨夜、城市远景"
}
```

处理逻辑：

1. 根据 `songId` 找到对应歌曲
2. 将歌曲状态标记为 `coverStatus=generating`
3. 调用 `VolcengineCoverClient`
4. 成功后回写 `coverUrl`
5. 将状态更新为 `ready`

## 4. 当前代码状态

当前仓库已经具备：

- 前端封面生成页面
- 后端 `/api/covers` 路由
- `VolcengineCoverClient` 适配层
- `mock` 模式下的 SVG 封面占位图

当前仓库还没有完全写死火山引擎真实请求签名，原因是生产接入通常与账号、Region、服务版本和鉴权方式绑定，直接写死风险很高。

## 5. 建议的真实接入步骤

### 5.1 配置环境变量

```env
VOLCENGINE_ACCESS_KEY=
VOLCENGINE_SECRET_KEY=
VOLCENGINE_REGION=cn-north-1
VOLCENGINE_IMAGE_MODEL=dreamina-v3.1
```

### 5.2 在适配层补充真实请求

需要补充的内容包括：

- 目标 API 域名
- Action / Version / Region
- 请求签名
- 图片生成模型参数
- 返回图片 URL 或图片二进制处理

### 5.3 产物落库

建议持久化以下信息：

- `songId`
- `prompt`
- `provider`
- `coverUrl`
- `raw response`
- `createdAt`

## 6. 封面提示词建议

封面提示词建议由以下信息组合：

- 歌曲标题
- 风格类型
- 角色或场景关键词
- 色调要求
- 构图要求

示例：

```text
电影感专辑封面，夜雨城市，霓虹倒影，孤独感，华语流行，深蓝与珊瑚橙主色，远景人物剪影，高级唱片封面构图
```

## 7. 本项目中的职责分层

### 前端

- 让用户选择已有歌曲
- 填写封面描述
- 发起生成
- 查看封面结果

### 后端

- 持有火山引擎密钥
- 执行鉴权与请求签名
- 更新歌曲封面状态
- 写入封面 URL

### Provider

- 负责与火山引擎交互
- 对外只暴露统一结果：`imageUrl`

## 8. 为什么首版先保留 mock

这是为了保证框架先完整可跑：

- 没有密钥也能演示完整流程
- 前端和后端任务链路先稳定
- 之后只替换 provider 内部实现

## 参考链接

- [火山引擎豆包图像生成相关文档](https://www.volcengine.com/docs/508/1364449)
- [火山引擎附加组件 2.0 使用方法](https://www.volcengine.com/docs/508/1963713)
- [火山引擎开放平台](https://www.volcengine.com/)

