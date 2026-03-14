import { z } from "zod";
import type { FastifyInstance } from "fastify";

import { genreRules } from "@ai-music/config";
import type { AppSettings } from "@ai-music/types";

import type { Env } from "../config/env.js";
import { extractNovelTextFromUpload } from "../services/file-import-service.js";
import type { NovelService } from "../services/novel-service.js";
import { getSettingsSnapshot, saveRuntimeSettings } from "../services/settings-service.js";
import type { TaskService } from "../services/task-service.js";

const quickCreateSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(6),
  stylePrompt: z.string().min(1),
  makeInstrumental: z.boolean().default(false),
  model: z.enum(["V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5"]).default("V4_5ALL"),
  negativeTags: z.string().optional(),
  vocalGender: z.enum(["", "m", "f"]).default("")
});

const importNovelSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(20)
});

const novelCreateSchema = z.object({
  documentId: z.string().min(1),
  mode: z.enum(["novel-full", "novel-excerpt", "character-theme", "scene-score", "style-remix"]),
  focus: z.string().min(2),
  stylePrompt: z.string().min(1),
  makeInstrumental: z.boolean().default(false),
  model: z.enum(["V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5"]).default("V4_5ALL"),
  negativeTags: z.string().optional(),
  vocalGender: z.enum(["", "m", "f"]).default(""),
  excerpt: z.string().optional(),
  title: z.string().min(1).optional(),
  prompt: z.string().min(6).optional()
});

const coverSchema = z.object({
  songId: z.string().min(1),
  prompt: z.string().min(3)
});

const settingsSchema = z.object({
  mockMode: z.boolean(),
  sunoApiKey: z.string(),
  sunoBaseUrl: z.string().url(),
  sunoGeneratePath: z.string().min(1),
  sunoDetailsPath: z.string().min(1),
  sunoCreditsPath: z.string().min(1),
  sunoCallbackUrl: z.union([z.literal(""), z.string().url()]),
  deepseekApiKey: z.string(),
  deepseekBaseUrl: z.string().url(),
  deepseekModel: z.string().min(1),
  volcengineAccessKey: z.string(),
  volcengineSecretKey: z.string(),
  volcengineRegion: z.string().min(1),
  volcengineImageModel: z.string().min(1)
}) satisfies z.ZodType<AppSettings>;

export async function registerApiRoutes(
  app: FastifyInstance,
  taskService: TaskService,
  novelService: NovelService,
  runtimeEnv: Env
) {
  app.get("/api/health", async () => ({
    ok: true,
    timestamp: new Date().toISOString()
  }));

  app.get("/api/overview", async () => {
    await taskService.reconcileStaleTasks();
    const snapshot = await taskService.getSnapshot();
    return {
      ...snapshot,
      rules: genreRules
    };
  });

  app.get("/api/account", async () => taskService.syncCredits());
  app.get("/api/settings", async () => getSettingsSnapshot(runtimeEnv));
  app.get("/api/tasks", async () => {
    await taskService.reconcileStaleTasks();
    return (await taskService.getSnapshot()).tasks;
  });
  app.get("/api/songs", async () => (await taskService.getSnapshot()).songs);
  app.get("/api/novels", async () => (await taskService.getSnapshot()).documents);
  app.get("/api/rules", async () => genreRules);

  app.post("/api/novels/import", async (request, reply) => {
    const input = importNovelSchema.parse(request.body);
    const document = await novelService.importNovel(input.title, input.text);
    reply.code(201);
    return document;
  });

  app.post("/api/novels/import-file", async (request, reply) => {
    try {
      const file = await request.file();

      if (!file) {
        reply.code(400);
        return {
          error: "No file uploaded"
        };
      }

      const buffer = await file.toBuffer();
      const extracted = await extractNovelTextFromUpload({
        filename: file.filename,
        buffer
      });
      const document = await novelService.importNovel(extracted.title, extracted.text);

      reply.code(201);
      return {
        ...document,
        importedFrom: {
          filename: file.filename,
          extension: extracted.extension,
          size: extracted.size
        }
      };
    } catch (error) {
      reply.code(error instanceof Error ? 400 : 500);
      return {
        error: error instanceof Error ? error.message : "File import failed"
      };
    }
  });

  app.post("/api/generate/quick", async (request, reply) => {
    const input = quickCreateSchema.parse(request.body);
    const song = await taskService.createQuickSong(input);
    reply.code(201);
    return song;
  });

  app.post("/api/generate/novel", async (request, reply) => {
    const input = novelCreateSchema.parse(request.body);
    const song = await taskService.createNovelSong(input);
    reply.code(201);
    return song;
  });

  app.post("/api/generate/novel/preview", async (request) => {
    const input = novelCreateSchema.omit({ title: true, prompt: true }).parse(request.body);
    const snapshot = await taskService.getSnapshot();
    const document = snapshot.documents.find((item) => item.id === input.documentId);

    if (!document) {
      throw new Error("Novel document not found");
    }

    return novelService.previewNovelSong(document, input);
  });

  app.post("/api/covers", async (request, reply) => {
    const input = coverSchema.parse(request.body);
    const result = await taskService.createCover(input);
    reply.code(201);
    return result;
  });

  app.put("/api/settings", async (request) => {
    const input = settingsSchema.parse(request.body);
    return saveRuntimeSettings(runtimeEnv, input);
  });

  app.delete("/api/songs/:songId", async (request) => {
    const params = z.object({ songId: z.string().min(1) }).parse(request.params);
    return taskService.deleteSong(params.songId);
  });

  app.delete("/api/tasks/:taskId", async (request) => {
    const params = z.object({ taskId: z.string().min(1) }).parse(request.params);
    return taskService.deleteFailedTask(params.taskId);
  });

  app.post("/api/tasks/:taskId/refresh", async (request) => {
    const params = z.object({ taskId: z.string().min(1) }).parse(request.params);
    return taskService.refreshTask(params.taskId);
  });

  app.post("/api/tasks/:taskId/retry", async (request, reply) => {
    const params = z.object({ taskId: z.string().min(1) }).parse(request.params);
    const song = await taskService.retryTask(params.taskId);
    reply.code(201);
    return song;
  });

  app.post("/api/providers/suno/callback", async (request, reply) => {
    const payload = (request.body ?? {}) as Record<string, any>;
    await taskService.handleWebhook(payload);
    reply.code(202);
    return {
      accepted: true
    };
  });
}
