export type ProviderMode = "mock" | "live";

export type GenerationMode =
  | "quick"
  | "novel-full"
  | "novel-excerpt"
  | "character-theme"
  | "scene-score"
  | "style-remix";

export type TaskStatus = "queued" | "running" | "succeeded" | "failed";

export type SongStatus = "draft" | "generating" | "ready" | "failed";

export type CoverStatus = "idle" | "generating" | "ready" | "failed";

export type SunoModel = "V4" | "V4_5" | "V4_5PLUS" | "V4_5ALL" | "V5";

export type VocalGender = "" | "m" | "f";

export interface SunoGenerationOptions {
  model: SunoModel;
  negativeTags?: string;
  vocalGender?: VocalGender;
}

export interface AccountInfo {
  provider: "sunoapi";
  mode: ProviderMode;
  creditsRemaining: number;
  callbackConfigured: boolean;
  lastCheckedAt: string | null;
}

export interface GenreRule {
  slug: string;
  name: string;
  bpmRange: string;
  mood: string[];
  instruments: string[];
  arrangementNotes: string[];
}

export interface Song {
  id: string;
  title: string;
  mode: GenerationMode;
  status: SongStatus;
  taskId: string;
  providerJobId: string | null;
  prompt: string;
  stylePrompt: string;
  makeInstrumental: boolean;
  model: SunoModel;
  negativeTags: string;
  vocalGender: VocalGender;
  lyricsSnippet: string;
  tags: string[];
  audioUrl: string | null;
  coverUrl: string | null;
  coverStatus: CoverStatus;
  durationSeconds: number | null;
  sourceDocumentId: string | null;
  sourceExcerpt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SongTask {
  id: string;
  songId: string;
  mode: GenerationMode;
  status: TaskStatus;
  providerTaskId: string | null;
  provider: "sunoapi";
  title: string;
  prompt: string;
  errorMessage: string | null;
  progressLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  label: string;
  text: string;
  tokens: string[];
  vector: number[];
}

export interface NovelDocument {
  id: string;
  title: string;
  text: string;
  summary: string;
  keyThemes: string[];
  characters: string[];
  createdAt: string;
  updatedAt: string;
  chunks: KnowledgeChunk[];
}

export interface QuickCreateInput {
  title: string;
  prompt: string;
  stylePrompt: string;
  makeInstrumental: boolean;
  model: SunoModel;
  negativeTags?: string;
  vocalGender?: VocalGender;
}

export interface NovelCreateInput {
  documentId: string;
  mode: Exclude<GenerationMode, "quick">;
  focus: string;
  stylePrompt: string;
  makeInstrumental: boolean;
  model: SunoModel;
  negativeTags?: string;
  vocalGender?: VocalGender;
  excerpt?: string;
  title?: string;
  prompt?: string;
}

export interface NovelPromptDraft {
  title: string;
  prompt: string;
  stylePrompt: string;
}

export type PromptAssetKey =
  | "document-analysis"
  | "segment-analysis"
  | "summary-merge"
  | "novel-song-plan";

export interface PromptAssetEntry {
  key: PromptAssetKey;
  title: string;
  description: string;
  targetModel: "deepseek";
  systemPrompt: string;
}

export interface PromptAssetLibrary {
  updatedAt: string | null;
  assets: PromptAssetEntry[];
}

export interface CoverCreateInput {
  songId: string;
  prompt: string;
}

export interface LibrarySnapshot {
  account: AccountInfo;
  songs: Song[];
  tasks: SongTask[];
  documents: NovelDocument[];
  rules: GenreRule[];
}

export interface AppSettings {
  mockMode: boolean;
  sunoApiKey: string;
  sunoBaseUrl: string;
  sunoGeneratePath: string;
  sunoDetailsPath: string;
  sunoCreditsPath: string;
  sunoCallbackUrl: string;
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
  volcengineAccessKey: string;
  volcengineSecretKey: string;
  volcengineRegion: string;
  volcengineImageModel: string;
}
