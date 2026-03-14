import path from "node:path";
import { fileURLToPath } from "node:url";

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";

import { env } from "./config/env.js";
import { DeepSeekClient } from "./providers/deepseek-client.js";
import { SunoClient } from "./providers/suno-client.js";
import { VolcengineCoverClient } from "./providers/volcengine-client.js";
import { registerApiRoutes } from "./routes/api.js";
import { NovelService } from "./services/novel-service.js";
import { hydrateRuntimeSettings } from "./services/settings-service.js";
import { TaskService } from "./services/task-service.js";

export async function buildServer() {
  await hydrateRuntimeSettings(env);

  const app = Fastify({
    logger: false
  });

  app.addHook("onRequest", async (request, reply) => {
    if (request.headers["access-control-request-private-network"] === "true") {
      reply.header("Access-Control-Allow-Private-Network", "true");
    }
  });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });
  await app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 1
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const path = issue?.path.join(".") || "请求参数";
      let message = issue?.message ?? "请求参数不合法";

      if (issue?.code === "too_small" && issue.path[0] === "text") {
        message = "正文太短，至少需要 20 个字符。";
      } else if (issue?.code === "too_small" && issue.path[0] === "prompt") {
        message = "提示词太短，请至少填写 6 个字符。";
      } else if (issue?.code === "invalid_type") {
        message = `${path} 的格式不正确。`;
      }

      reply.code(400).send({
        error: message,
        field: path
      });
      return;
    }

    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number" &&
      (error as { statusCode?: number }).statusCode! >= 400
        ? (error as { statusCode?: number }).statusCode!
        : 500;

    reply.code(statusCode).send({
      error: error instanceof Error ? error.message : "服务器内部错误"
    });
  });

  const sunoClient = new SunoClient(env);
  const coverClient = new VolcengineCoverClient(env);
  const deepseekClient = new DeepSeekClient(env);
  const novelService = new NovelService(deepseekClient);
  const taskService = new TaskService(sunoClient, coverClient, novelService);

  await registerApiRoutes(app, taskService, novelService, env);

  return app;
}

async function main() {
  const app = await buildServer();
  await app.listen({
    port: env.port,
    host: "0.0.0.0"
  });

  console.log(`AI Music server running at http://localhost:${env.port}`);
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentPath = fileURLToPath(import.meta.url);

if (entryPath === currentPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
