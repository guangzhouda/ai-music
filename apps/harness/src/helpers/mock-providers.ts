import type { SunoCreatePayload, SunoCreateResult, SunoTaskDetails } from "../../../server/src/providers/suno-client.js";

/**
 * 可编程的 SunoClient fake。
 * 通过方法直接控制每次调用的返回值，用于测试 TaskService。
 */
export class FakeSunoClient {
  runtimeMode: "mock" | "live" = "mock";
  callbackConfigured = false;

  // 可编程的返回值
  nextCreateResult: SunoCreateResult = { providerTaskId: "suno_fake001", raw: { mode: "fake" } };
  nextTaskDetails: SunoTaskDetails = {
    status: "succeeded",
    audioUrl: "https://example.com/audio.mp3",
    lyricsSnippet: "Fake lyrics",
    durationSeconds: 180,
    errorMessage: null,
    clips: [
      {
        clipId: "suno_fake001:clip-1",
        title: "Fake Song",
        audioUrl: "https://example.com/audio.mp3",
        coverUrl: null,
        lyricsSnippet: "Fake lyrics",
        durationSeconds: 180,
        raw: { mode: "fake" }
      }
    ],
    raw: { mode: "fake" }
  };
  nextCredits = { creditsRemaining: 42, raw: { mode: "fake" } };

  // 用于断言调用记录
  createMusicCalls: SunoCreatePayload[] = [];
  getTaskDetailsCalls: string[] = [];
  getCreditsCalls = 0;

  async createMusic(payload: SunoCreatePayload): Promise<SunoCreateResult> {
    this.createMusicCalls.push(payload);
    return this.nextCreateResult;
  }

  async getTaskDetails(taskId: string, _fallbackPrompt: string): Promise<SunoTaskDetails> {
    this.getTaskDetailsCalls.push(taskId);
    return this.nextTaskDetails;
  }

  async getCredits() {
    this.getCreditsCalls += 1;
    return this.nextCredits;
  }

  buildQuickPayload(input: any): SunoCreatePayload {
    return {
      title: input.title,
      prompt: input.prompt,
      stylePrompt: input.stylePrompt,
      mode: "quick",
      makeInstrumental: input.makeInstrumental,
      model: input.model,
      negativeTags: input.negativeTags,
      vocalGender: input.vocalGender
    };
  }

  /** 重置所有调用记录与可编程返回值 */
  reset() {
    this.createMusicCalls = [];
    this.getTaskDetailsCalls = [];
    this.getCreditsCalls = 0;
    this.runtimeMode = "mock";
    this.nextCreateResult = { providerTaskId: "suno_fake001", raw: { mode: "fake" } };
    this.nextTaskDetails = {
      status: "succeeded",
      audioUrl: "https://example.com/audio.mp3",
      lyricsSnippet: "Fake lyrics",
      durationSeconds: 180,
      errorMessage: null,
      clips: [
        {
          clipId: "suno_fake001:clip-1",
          title: "Fake Song",
          audioUrl: "https://example.com/audio.mp3",
          coverUrl: null,
          lyricsSnippet: "Fake lyrics",
          durationSeconds: 180,
          raw: { mode: "fake" }
        }
      ],
      raw: { mode: "fake" }
    };
    this.nextCredits = { creditsRemaining: 42, raw: { mode: "fake" } };
  }
}

/**
 * 可编程的 VolcengineCoverClient fake。
 */
export class FakeCoverClient {
  nextImageUrl = "data:image/svg+xml,<svg></svg>";

  async createCover(_prompt: string, _title: string) {
    return {
      imageUrl: this.nextImageUrl,
      raw: { mode: "fake" }
    };
  }
}

/**
 * 可编程的 NovelService fake。
 * 用于测试 TaskService.createNovelSong()。
 */
export class FakeNovelService {
  nextComposed: { title: string; prompt: string; stylePrompt: string } = {
    title: "测试小说 · 全文成歌",
    prompt: "根据小说生成的测试提示词",
    stylePrompt: "华语流行电影感"
  };

  async composeNovelPrompt(_document: any, _input: any) {
    return this.nextComposed;
  }

  async importNovel(_title: string, _text: string) {
    return {
      id: "doc_fake001",
      title: _title,
      text: _text,
      summary: "测试摘要",
      keyThemes: ["测试主题"],
      characters: ["测试角色"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chunks: []
    };
  }

  async previewNovelSong(_document: any, _input: any) {
    return this.nextComposed;
  }
}
