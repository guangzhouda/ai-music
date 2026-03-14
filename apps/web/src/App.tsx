import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";

import { appMeta } from "@ai-music/config";
import type {
  AccountInfo,
  AppSettings,
  GenreRule,
  LibrarySnapshot,
  NovelDocument,
  NovelPromptDraft,
  PromptAssetLibrary,
  Song,
  SongTask,
  SunoModel,
  VocalGender
} from "@ai-music/types";
import { Panel, Tag, cx } from "@ai-music/ui";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

const docsCatalog = [
  {
    id: "suno",
    category: "API",
    title: "Suno API 摘要",
    description: "整理生成、状态查询、余额和回调的工程映射方式。",
    href: "https://docs.sunoapi.org/"
  },
  {
    id: "cover",
    category: "Provider",
    title: "火山引擎封面生成",
    description: "说明封面生成在当前项目里的 provider 封装与接入边界。",
    href: "https://www.volcengine.com/docs/508/1364449"
  },
  {
    id: "style",
    category: "Rules",
    title: "音乐风格规则",
    description: "整理流行、国风、电子、摇滚等风格的节奏、配器和编排规则。",
    href: "https://support.spotify.com/us/artists/article/loudness-normalization/"
  },
  {
    id: "novel",
    category: "Design",
    title: "小说成歌方案",
    description: "说明全文导入、切块检索、角色与场景模式的提示词构造方式。",
    href: "#"
  },
  {
    id: "architecture",
    category: "System",
    title: "系统架构",
    description: "概览前后端模块、Provider、任务状态机和数据流。",
    href: "#"
  }
];

const sunoModelOptions: Array<{ value: SunoModel; label: string }> = [
  { value: "V4", label: "V4" },
  { value: "V4_5", label: "V4.5" },
  { value: "V4_5PLUS", label: "V4.5+" },
  { value: "V4_5ALL", label: "V4.5 All" },
  { value: "V5", label: "V5" }
];

const vocalGenderOptions: Array<{ value: VocalGender; label: string }> = [
  { value: "", label: "自动" },
  { value: "f", label: "女声" },
  { value: "m", label: "男声" }
];

function toReadableErrorMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }

  if (Array.isArray(value) && value.length > 0) {
    return toReadableErrorMessage(value[0]);
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    if ("message" in value && typeof value.message === "string") {
      return value.message;
    }
    if ("error" in value && typeof value.error === "string") {
      return value.error;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value ?? "未知错误");
}

function buildStyleText(rules: GenreRule[], styleRuleSlug: string, customNotes: string) {
  const rule = rules.find((entry) => entry.slug === styleRuleSlug) ?? rules[0];
  if (!rule) {
    return customNotes.trim();
  }

  const segments = [
    `${rule.name}，节奏 ${rule.bpmRange}`,
    `重点配器：${rule.instruments.join("、")}`,
    `编曲说明：${rule.arrangementNotes.join("；")}`
  ];

  if (customNotes.trim()) {
    segments.push(`额外要求：${customNotes.trim()}`);
  }

  return segments.join("，");
}

async function fetchJson<T>(path: string, init?: RequestInit) {
  let response: Response;
  const headers = new Headers(init?.headers);

  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers
    });
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message.includes("Failed to fetch")
        ? "无法连接到本地后端，请确认 `npm run dev` 已启动，且 8787 端口可访问。"
        : error instanceof Error
          ? error.message
          : "网络请求失败"
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      (payload && typeof payload === "object" && "message" in payload ? (payload as { message?: unknown }).message : null) ??
      (payload && typeof payload === "object" && "error" in payload ? (payload as { error?: unknown }).error : null) ??
      `${response.status} ${response.statusText}`;

    throw new Error(toReadableErrorMessage(message));
  }

  return (await response.json()) as T;
}

const emptyOverview: LibrarySnapshot = {
  account: {
    provider: "sunoapi",
    mode: "mock",
    creditsRemaining: 0,
    callbackConfigured: false,
    lastCheckedAt: null
  },
  songs: [],
  tasks: [],
  documents: [],
  rules: []
};

const emptyPromptAssets: PromptAssetLibrary = {
  updatedAt: null,
  assets: []
};

const taskStatusTextMap: Record<SongTask["status"], string> = {
  queued: "排队中",
  running: "处理中",
  succeeded: "已完成",
  failed: "失败"
};

const songStatusTextMap: Record<Song["status"], string> = {
  draft: "草稿",
  generating: "生成中",
  ready: "可播放",
  failed: "失败"
};

function App() {
  const [overview, setOverview] = useState<LibrarySnapshot>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncingAccount, setSyncingAccount] = useState(false);

  async function refreshOverview() {
    try {
      setLoading(true);
      const [overviewResult, accountResult] = await Promise.allSettled([
        fetchJson<LibrarySnapshot>("/api/overview"),
        fetchJson<AccountInfo>("/api/account")
      ]);

      if (overviewResult.status !== "fulfilled") {
        throw overviewResult.reason;
      }

      setOverview({
        ...overviewResult.value,
        account:
          accountResult.status === "fulfilled"
            ? accountResult.value
            : overviewResult.value.account
      });
      setError("");
    } catch (fetchError) {
      setError(toReadableErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshOverview();
  }, []);

  async function refreshAccount() {
    try {
      setSyncingAccount(true);
      const account = await fetchJson<AccountInfo>("/api/account");
      setOverview((current) => ({
        ...current,
        account
      }));
      setError("");
    } catch (fetchError) {
      setError(toReadableErrorMessage(fetchError));
    } finally {
      setSyncingAccount(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">A</span>
          <div>
            <strong>{appMeta.name}</strong>
            <p>{appMeta.tagline}</p>
          </div>
        </Link>
        <nav className="nav">
          {[
            ["/", "工作台"],
            ["/quick", "一键成歌"],
            ["/novel", "小说成歌"],
            ["/library", "音乐库"],
            ["/cover", "封面"],
            ["/tasks", "任务"],
            ["/account", "账户"],
            ["/settings", "设置"],
            ["/assets", "资产库"],
            ["/docs", "文档"]
          ].map(([path, label]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => cx("nav-link", isActive && "nav-link-active")}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="ghost-button" onClick={() => void refreshOverview()} type="button">
          刷新数据
        </button>
      </header>

      <main className="page">
        {error ? <div className="error-banner">接口错误：{error}</div> : null}
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                account={overview.account}
                songs={overview.songs}
                tasks={overview.tasks}
                documents={overview.documents}
                loading={loading}
              />
            }
          />
          <Route
            path="/quick"
            element={<QuickCreatePage onSuccess={refreshOverview} rules={overview.rules} />}
          />
          <Route
            path="/novel"
            element={
              <NovelStudioPage
                documents={overview.documents}
                rules={overview.rules}
                onSuccess={refreshOverview}
              />
            }
          />
          <Route
            path="/library"
            element={<LibraryPage songs={overview.songs} onSuccess={refreshOverview} />}
          />
          <Route
            path="/cover"
            element={<CoverStudioPage songs={overview.songs} onSuccess={refreshOverview} />}
          />
          <Route
            path="/tasks"
            element={<TasksPage tasks={overview.tasks} onSuccess={refreshOverview} />}
          />
          <Route
            path="/account"
            element={
              <AccountPage
                account={overview.account}
                onRefreshAccount={refreshAccount}
                rules={overview.rules}
                syncingAccount={syncingAccount}
              />
            }
          />
          <Route path="/settings" element={<SettingsPage onSaved={refreshOverview} />} />
          <Route path="/assets" element={<AssetLibraryPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function DashboardPage(props: {
  account: AccountInfo;
  songs: Song[];
  tasks: SongTask[];
  documents: NovelDocument[];
  loading: boolean;
}) {
  const latestSongs = props.songs.slice(0, 3);
  const latestTasks = props.tasks.slice(0, 4);

  return (
    <div className="single-column dashboard-page">
      <section className="hero">
        <div className="hero-copy">
          <Tag tone="accent">Suno + 小说成歌</Tag>
          <h1>把创意和剧情直接推进成可执行歌曲任务。</h1>
          <p>
            首页只保留入口、状态和最近结果。规则库、API 摘要和系统设计已经拆到独立文档页。
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/quick">
              立即一键成歌
            </Link>
            <Link className="ghost-button" to="/novel">
              打开小说工作台
            </Link>
            <Link className="ghost-button" to="/docs">
              查看文档
            </Link>
          </div>
        </div>
        <Panel className="hero-panel">
          <div className="stat-row">
            <Metric title="模式" value={props.account.mode === "mock" ? "Mock" : "Live"} />
            <Metric title="余额" value={String(props.account.creditsRemaining)} />
            <Metric title="歌曲" value={String(props.songs.length)} />
            <Metric title="任务" value={String(props.tasks.length)} />
          </div>
          <div className="entry-grid">
            <Link className="feature-card feature-link" to="/quick">
              <strong>一键成歌</strong>
              <p>从一句简短描述直接创建 Suno 任务。</p>
            </Link>
            <Link className="feature-card feature-link" to="/novel">
              <strong>小说成歌</strong>
              <p>按全文、节选、角色、场景多模式生成。</p>
            </Link>
            <Link className="feature-card feature-link" to="/library">
              <strong>音乐库</strong>
              <p>统一查看歌曲、封面、音频和来源。</p>
            </Link>
            <Link className="feature-card feature-link" to="/docs">
              <strong>文档</strong>
              <p>查看 API 摘要、风格规则和系统设计。</p>
            </Link>
          </div>
        </Panel>
      </section>

      <div className="two-column dashboard-lower">
        <Panel>
          <SectionTitle
            eyebrow="Recent"
            title="最近生成"
            description={props.loading ? "正在加载当前工作台数据。" : "展示最近的歌曲结果。"}
          />
          <div className="stack-list compact-scroll">
            {latestSongs.length === 0 ? (
              <EmptyState text="还没有歌曲，先去一键成歌或导入小说。" />
            ) : (
              latestSongs.map((song) => (
                <article className="list-card" key={song.id}>
                  <div>
                    <strong>{song.title}</strong>
                    <p>{song.prompt.slice(0, 88)}</p>
                  </div>
                  <Tag tone={song.status === "ready" ? "success" : "default"}>{song.status}</Tag>
                </article>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            eyebrow="Tasks"
            title="最近任务"
            description="统一状态机负责提交、轮询和回调后的结果更新。"
          />
          <div className="stack-list compact-scroll">
            {latestTasks.length === 0 ? (
              <EmptyState text="当前还没有任务。" />
            ) : (
              latestTasks.map((task) => (
                <article className="list-card" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.progressLabel}</p>
                  </div>
                  <Tag tone={task.status === "succeeded" ? "success" : "default"}>
                    {task.status}
                  </Tag>
                </article>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            eyebrow="Knowledge"
            title="已导入文档"
            description="这里只保留文档状态概览。"
          />
          <div className="stack-list compact-scroll">
            {props.documents.length === 0 ? (
              <EmptyState text="还没有导入文本。" />
            ) : (
              props.documents.slice(0, 4).map((document) => (
                <article className="list-card" key={document.id}>
                  <div>
                    <strong>{document.title}</strong>
                    <p>{document.summary}</p>
                  </div>
                  <Tag>{document.chunks.length} chunks</Tag>
                </article>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function DocsPage() {
  return (
    <div className="two-column docs-page">
      <Panel>
        <SectionTitle
          eyebrow="Docs"
          title="项目文档"
          description="集中查看外部 API 摘要、风格规则和系统设计，不再与首页内容混在一起。"
        />
        <div className="docs-grid">
          {docsCatalog.map((docItem) => (
            <article className="doc-card" key={docItem.id}>
              <Tag>{docItem.category}</Tag>
              <strong>{docItem.title}</strong>
              <p>{docItem.description}</p>
              {docItem.href === "#" ? (
                <span className="doc-hint">对应正式内容已保存在仓库 `doc/` 目录。</span>
              ) : (
                <a className="doc-link" href={docItem.href} rel="noreferrer" target="_blank">
                  打开参考链接
                </a>
              )}
            </article>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Repo Docs"
          title="仓库内文档文件"
          description="以下文件是项目中的正式文档落点。"
        />
        <div className="stack-list compact-scroll">
          {[
            "doc/suno-api-summary.md",
            "doc/volcengine-cover-api.md",
            "doc/music-style-rules.md",
            "doc/novel-to-song-design.md",
            "doc/system-architecture.md",
            "README.md"
          ].map((file) => (
            <article className="list-card" key={file}>
              <div>
                <strong>{file}</strong>
                <p>仓库内的正式文档文件。</p>
              </div>
              <Tag>Local</Tag>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AssetLibraryPage() {
  const [library, setLibrary] = useState<PromptAssetLibrary>(emptyPromptAssets);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      try {
        const result = await fetchJson<PromptAssetLibrary>("/api/prompt-assets");
        if (!cancelled) {
          setLibrary(result);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(toReadableErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  function patchAsset(key: PromptAssetLibrary["assets"][number]["key"], systemPrompt: string) {
    setLibrary((current) => ({
      ...current,
      assets: current.assets.map((asset) => (asset.key === key ? { ...asset, systemPrompt } : asset))
    }));
  }

  async function saveAssets() {
    setSaving(true);
    setMessage("");

    try {
      const result = await fetchJson<PromptAssetLibrary>("/api/prompt-assets", {
        method: "PUT",
        body: JSON.stringify(library)
      });
      setLibrary(result);
      setMessage("资产库已保存。后续 DeepSeek 摘要、角色提取和小说成歌都会使用这里的系统提示词。");
    } catch (error) {
      setMessage(toReadableErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="single-column asset-page">
      <Panel>
        <SectionTitle
          eyebrow="Assets"
          title="提示词资产库"
          description="这里维护所有会发给 DeepSeek 的系统提示词。它们不会直接发给 Suno，但会影响摘要、角色提取、小说成歌提示词草稿和最终歌词内容。"
        />
        <div className="settings-toolbar">
          <div className="runtime-mode-card">
            <span className="toggle-label">当前用途</span>
            <span className="field-hint">
              导入全文时的摘要、长文分段分析、全文汇总、小说成歌草稿生成，都会使用下面这些大模型系统提示词。
            </span>
          </div>
          <button className="primary-button" disabled={loading || saving} onClick={() => void saveAssets()} type="button">
            {saving ? "保存中..." : "保存资产"}
          </button>
        </div>
        {message ? <div className="inline-message">{message}</div> : null}
      </Panel>

      <div className="asset-grid">
        {library.assets.map((asset) => (
          <Panel key={asset.key}>
            <div className="asset-card-header">
              <div>
                <Tag tone="accent">{asset.targetModel}</Tag>
                <h3>{asset.title}</h3>
              </div>
              <span className="asset-key">{asset.key}</span>
            </div>
            <p className="asset-description">{asset.description}</p>
            <label className="asset-label">
              系统提示词
              <textarea
                rows={10}
                value={asset.systemPrompt}
                onChange={(event) => patchAsset(asset.key, event.target.value)}
              />
            </label>
            <p className="field-hint">
              说明：这部分是发给 DeepSeek 的 system prompt。实际业务数据，例如全文摘要、角色、节选内容，会作为 user prompt 在运行时拼接。
            </p>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function QuickCreatePage(props: { onSuccess: () => Promise<void>; rules: GenreRule[] }) {
  const [title, setTitle] = useState("夜航城市");
  const [prompt, setPrompt] = useState("写一首关于凌晨城市、霓虹和独自赶路的华语流行歌曲");
  const [styleRuleSlug, setStyleRuleSlug] = useState(props.rules[0]?.slug ?? "mandopop-cinematic");
  const [customStyleNotes, setCustomStyleNotes] = useState("");
  const [makeInstrumental, setMakeInstrumental] = useState(false);
  const [model, setModel] = useState<SunoModel>("V4_5ALL");
  const [negativeTags, setNegativeTags] = useState("");
  const [vocalGender, setVocalGender] = useState<VocalGender>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!props.rules.find((rule) => rule.slug === styleRuleSlug) && props.rules[0]) {
      setStyleRuleSlug(props.rules[0].slug);
    }
  }, [props.rules, styleRuleSlug]);

  async function submit() {
    setSubmitting(true);
    try {
      await fetchJson("/api/generate/quick", {
        method: "POST",
        body: JSON.stringify({
          title,
          prompt,
          stylePrompt: buildStyleText(props.rules, styleRuleSlug, customStyleNotes),
          makeInstrumental,
          model,
          negativeTags,
          vocalGender
        })
      });
      await props.onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="single-column quick-page">
      <Panel>
        <SectionTitle
          eyebrow="Quick Create"
          title="一键成歌"
          description="输入一句需求，系统会组织标题、风格和提示词后提交到 Suno。"
        />
        <div className="quick-layout">
          <div className="form-grid no-margin">
            <label>
              标题
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              风格规则
              <select value={styleRuleSlug} onChange={(event) => setStyleRuleSlug(event.target.value)}>
                {props.rules.map((rule) => (
                  <option key={rule.slug} value={rule.slug}>
                    {rule.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              模型
              <select value={model} onChange={(event) => setModel(event.target.value as SunoModel)}>
                {sunoModelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-span">
              提交给 Suno 的歌词/内容提示词
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} />
              <span className="field-hint">
                这里的内容会直接提交给 Suno。人声歌曲场景下，它通常会同时影响歌词、叙事和旋律走向。
              </span>
            </label>
            <label className="full-span">
              风格补充
              <textarea
                value={customStyleNotes}
                onChange={(event) => setCustomStyleNotes(event.target.value)}
                rows={3}
                placeholder="例如：副歌更大开大合，主歌更克制，偏电影配乐。"
              />
            </label>
            <label>
              人声性别
              <select value={vocalGender} onChange={(event) => setVocalGender(event.target.value as VocalGender)}>
                {vocalGenderOptions.map((option) => (
                  <option key={option.value || "auto"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              反向标签
              <input
                value={negativeTags}
                onChange={(event) => setNegativeTags(event.target.value)}
                placeholder="例如：screamo, heavy distortion"
              />
            </label>
            <label className="checkbox-row full-span">
              <input
                checked={makeInstrumental}
                onChange={(event) => setMakeInstrumental(event.target.checked)}
                type="checkbox"
              />
              仅生成纯音乐
            </label>
          </div>
          <div className="quick-side">
            <div className="stack-list">
              <article className="list-card">
                <div>
                  <strong>标题</strong>
                  <p>{title || "未填写标题"}</p>
                </div>
              </article>
              <article className="list-card">
                <div>
                  <strong>模式</strong>
                  <p>{makeInstrumental ? "纯音乐" : "人声歌曲"}</p>
                </div>
              </article>
              <article className="list-card">
                <div>
                  <strong>风格</strong>
                  <p>{buildStyleText(props.rules, styleRuleSlug, customStyleNotes)}</p>
                </div>
              </article>
              <article className="list-card">
                <div>
                  <strong>模型 / 人声</strong>
                  <p>
                    {model}
                    {makeInstrumental ? " / 纯音乐" : ` / ${vocalGenderOptions.find((option) => option.value === vocalGender)?.label ?? "自动"}`}
                  </p>
                </div>
              </article>
            </div>
            <button className="primary-button quick-submit" onClick={() => void submit()} type="button">
              {submitting ? "提交中..." : "提交 Suno 任务"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function NovelStudioPage(props: {
  documents: NovelDocument[];
  rules: GenreRule[];
  onSuccess: () => Promise<void>;
}) {
  const [title, setTitle] = useState("未命名小说");
  const [text, setText] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [mode, setMode] = useState("novel-full");
  const [focus, setFocus] = useState("围绕主角命运和故事宿命感");
  const [styleRuleSlug, setStyleRuleSlug] = useState(props.rules[0]?.slug ?? "mandopop-cinematic");
  const [customStyleNotes, setCustomStyleNotes] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [makeInstrumental, setMakeInstrumental] = useState(false);
  const [model, setModel] = useState<SunoModel>("V4_5ALL");
  const [negativeTags, setNegativeTags] = useState("");
  const [vocalGender, setVocalGender] = useState<VocalGender>("");
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftStylePrompt, setDraftStylePrompt] = useState("");
  const [draftSignature, setDraftSignature] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeDocument = props.documents.find((document) => document.id === documentId) ?? null;
  const currentStylePrompt = buildStyleText(props.rules, styleRuleSlug, customStyleNotes);
  const currentDraftSignature = JSON.stringify({
    documentId,
    mode,
    focus,
    stylePrompt: currentStylePrompt,
    makeInstrumental,
    model,
    negativeTags,
    vocalGender,
    excerpt
  });
  const draftStale = Boolean(draftSignature) && draftSignature !== currentDraftSignature;

  useEffect(() => {
    if (!props.documents.length) {
      if (documentId) {
        setDocumentId("");
      }

      return;
    }

    const stillExists = props.documents.some((document) => document.id === documentId);
    if (!stillExists) {
      setDocumentId(props.documents[0].id);
    }
  }, [documentId, props.documents]);

  useEffect(() => {
    if (!props.rules.find((rule) => rule.slug === styleRuleSlug) && props.rules[0]) {
      setStyleRuleSlug(props.rules[0].slug);
    }
  }, [props.rules, styleRuleSlug]);

  async function importDocument() {
    setImporting(true);
    setImportMessage("");
    try {
      const document = await fetchJson<NovelDocument>("/api/novels/import", {
        method: "POST",
        body: JSON.stringify({ title, text })
      });
      setDocumentId(document.id);
      setText("");
      setDraftSignature("");
      setDraftTitle("");
      setDraftPrompt("");
      setDraftStylePrompt("");
      await props.onSuccess();
      setImportMessage(`已导入文本：${document.title}`);
    } catch (error) {
      setImportMessage(toReadableErrorMessage(error));
    } finally {
      setImporting(false);
    }
  }

  async function importFile() {
    if (!selectedFile) {
      return;
    }

    setUploading(true);
    setImportMessage("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${apiBaseUrl}/api/novels/import-file`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(toReadableErrorMessage(payload?.error ?? `${response.status} ${response.statusText}`));
      }

      const document = (await response.json()) as NovelDocument;
      setDocumentId(document.id);
      setSelectedFile(null);
      setFileInputKey((current) => current + 1);
      setDraftSignature("");
      setDraftTitle("");
      setDraftPrompt("");
      setDraftStylePrompt("");
      await props.onSuccess();
      setImportMessage(`已导入文件：${document.title}`);
    } catch (error) {
      setImportMessage(toReadableErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function generateDraft() {
    if (!documentId) {
      return;
    }

    setDraftLoading(true);
    setDraftMessage("");
    try {
      const draft = await fetchJson<NovelPromptDraft>("/api/generate/novel/preview", {
        method: "POST",
        body: JSON.stringify({
          documentId,
          mode,
          focus,
          stylePrompt: currentStylePrompt,
          makeInstrumental,
          model,
          negativeTags,
          vocalGender,
          excerpt
        })
      });
      setDraftTitle(draft.title);
      setDraftPrompt(draft.prompt);
      setDraftStylePrompt(draft.stylePrompt);
      setDraftSignature(currentDraftSignature);
      setDraftMessage("提示词草稿已生成。你可以继续修改后再提交到 Suno。");
    } catch (error) {
      setDraftMessage(toReadableErrorMessage(error));
    } finally {
      setDraftLoading(false);
    }
  }

  async function generateNovelSong() {
    if (!documentId || !draftPrompt.trim()) {
      return;
    }

    setSubmitting(true);
    setDraftMessage("");
    try {
      await fetchJson("/api/generate/novel", {
        method: "POST",
        body: JSON.stringify({
          documentId,
          mode,
          focus,
          stylePrompt: draftStylePrompt.trim() || currentStylePrompt,
          makeInstrumental,
          model,
          negativeTags,
          vocalGender,
          excerpt,
          title: draftTitle.trim(),
          prompt: draftPrompt.trim()
        })
      });
      await props.onSuccess();
      setDraftMessage("歌曲任务已提交到 Suno。");
    } catch (error) {
      setDraftMessage(toReadableErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="single-column novel-page">
      <Panel>
        <SectionTitle
          eyebrow="Import"
          title="导入全文"
          description="后端会自动切块、生成摘要和关键词，作为小说成歌的知识底座。"
        />
        <div className="form-grid">
          <label>
            文本标题
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="full-span">
            正文
            <textarea
              placeholder="粘贴整篇小说、章节或长文内容。"
              rows={8}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
        </div>
        <div className="import-actions">
          <button className="primary-button" onClick={() => void importDocument()} type="button">
            {importing ? "导入中..." : "导入正文"}
          </button>
          <div className="upload-box upload-box-inline">
            <strong>文件导入</strong>
            <label className="file-picker">
              <input
                key={fileInputKey}
                accept=".txt,.md,.docx,.pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <span>{selectedFile ? selectedFile.name : "选择 txt / md / docx / pdf"}</span>
            </label>
            <button
              className="ghost-button"
              disabled={!selectedFile || uploading}
              onClick={() => void importFile()}
              type="button"
            >
              {uploading ? "上传中..." : "上传并导入"}
            </button>
          </div>
        </div>
        {importMessage ? <div className="inline-message">{importMessage}</div> : null}
        <div className="imported-docs">
          <strong>已导入文档</strong>
          {props.documents.length === 0 ? (
            <p className="import-note">当前还没有文档。导入后会自动选中最新文档用于下方生成。</p>
          ) : (
            <div className="stack-list compact-scroll imported-doc-list">
              {props.documents.map((document) => (
                <button
                  key={document.id}
                  className={cx("doc-pick", documentId === document.id && "doc-pick-active")}
                  onClick={() => setDocumentId(document.id)}
                  type="button"
                >
                  <span>{document.title}</span>
                  <small>{document.chunks.length} chunks · {document.characters.slice(0, 3).join("、") || "待分析"}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Generate"
          title="小说成歌"
          description="先根据全文和节选生成 Suno 提示词草稿，再手动修改后提交。"
        />
        <div className="inline-message">
          摘要、角色提取和小说成歌草稿使用的 DeepSeek 系统提示词，已集中放到
          {" "}
          <Link className="inline-link" to="/assets">
            资产库
          </Link>
          {" "}
          里维护。
        </div>
        <div className="card-grid compact">
          {[
            ["novel-full", "全文成歌"],
            ["novel-excerpt", "节选成歌"],
            ["character-theme", "角色主题曲"],
            ["scene-score", "场景配乐"],
            ["style-remix", "风格重编"]
          ].map(([value, label]) => (
            <button
              key={value}
              className={cx("mode-card", mode === value && "mode-card-active")}
              onClick={() => setMode(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="toggle-block">
          <span className="toggle-label">生成类型</span>
          <div className="switch-row">
            <button
              className={cx("toggle-chip", !makeInstrumental && "toggle-chip-active")}
              onClick={() => setMakeInstrumental(false)}
              type="button"
            >
              生成人声歌曲
            </button>
            <button
              className={cx("toggle-chip", makeInstrumental && "toggle-chip-active")}
              onClick={() => setMakeInstrumental(true)}
              type="button"
            >
              生成纯音乐
            </button>
          </div>
        </div>
        <div className="form-grid">
          <label>
            选择文档
            <select value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
              {!props.documents.length ? <option value="">请先在左侧导入文档</option> : null}
              {props.documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
            {!props.documents.length ? (
              <span className="field-hint">导入成功后，这里会自动切换到最新文档。</span>
            ) : null}
          </label>
          <label>
            风格
            <select value={styleRuleSlug} onChange={(event) => setStyleRuleSlug(event.target.value)}>
              {props.rules.map((rule) => (
                <option key={rule.slug} value={rule.slug}>
                  {rule.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            模型
            <select value={model} onChange={(event) => setModel(event.target.value as SunoModel)}>
              {sunoModelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="full-span">
            聚焦内容
            <textarea value={focus} rows={3} onChange={(event) => setFocus(event.target.value)} />
          </label>
          <label className="full-span">
            风格补充
            <textarea
              value={customStyleNotes}
              rows={3}
              onChange={(event) => setCustomStyleNotes(event.target.value)}
              placeholder="例如：更强调宿命感、女声主唱、主歌更轻，副歌更炸裂。"
            />
          </label>
          <label>
            人声性别
            <select value={vocalGender} onChange={(event) => setVocalGender(event.target.value as VocalGender)}>
              {vocalGenderOptions.map((option) => (
                <option key={option.value || "auto"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            反向标签
            <input
              value={negativeTags}
              onChange={(event) => setNegativeTags(event.target.value)}
              placeholder="例如：metal scream, noisy intro"
            />
          </label>
          <label className="full-span">
            节选内容或角色说明
            <textarea
              value={excerpt}
              rows={3}
              onChange={(event) => setExcerpt(event.target.value)}
              placeholder="可粘贴段落、对白、角色介绍等。"
            />
          </label>
        </div>
        {activeDocument ? (
          <div className="selected-doc-summary">
            <strong>{activeDocument.title}</strong>
            <p>{activeDocument.summary}</p>
          </div>
        ) : null}
        <div className="form-actions">
          <button
            className="ghost-button"
            disabled={!documentId || draftLoading}
            onClick={() => void generateDraft()}
            type="button"
          >
            {draftLoading ? "生成草稿中..." : "先生成提示词草稿"}
          </button>
          <button
            className="primary-button"
            disabled={!documentId || !draftPrompt.trim() || draftStale || submitting}
            onClick={() => void generateNovelSong()}
            type="button"
          >
            {submitting ? "提交中..." : "提交到 Suno"}
          </button>
        </div>
        {draftStale ? (
          <div className="inline-message">参数已变更，请先重新生成提示词草稿，再提交到 Suno。</div>
        ) : null}
        {draftMessage ? <div className="inline-message">{draftMessage}</div> : null}
        <div className="form-grid prompt-review-grid">
          <label className="full-span">
            最终歌名
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="先点击“生成提示词草稿”"
            />
          </label>
          <label className="full-span">
            最终提交给 Suno 的歌词/内容提示词
            <textarea
              value={draftPrompt}
              rows={10}
              onChange={(event) => setDraftPrompt(event.target.value)}
              placeholder="这里会显示 AI 基于全文生成的歌词/内容提示词，你可以直接修改。"
            />
            <span className="field-hint">
              Suno 会直接使用这里的内容进行歌曲生成。对人声歌曲来说，这一段通常会强烈影响歌词和叙事。
            </span>
          </label>
          <label className="full-span">
            最终提交给 Suno 的风格提示词
            <textarea
              value={draftStylePrompt}
              rows={4}
              onChange={(event) => setDraftStylePrompt(event.target.value)}
              placeholder="这里会显示最终风格文本。"
            />
          </label>
        </div>
      </Panel>
    </div>
  );
}

function LibraryPage(props: { songs: Song[]; onSuccess: () => Promise<void> }) {
  const [selectedSongId, setSelectedSongId] = useState("");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [removingSongIds, setRemovingSongIds] = useState<string[]>([]);
  const [deleteMessage, setDeleteMessage] = useState("");
  const visibleSongs = [...props.songs]
    .filter((song) => !removingSongIds.includes(song.id))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  const selectedSong = visibleSongs.find((song) => song.id === selectedSongId);

  useEffect(() => {
    if (!visibleSongs.length) {
      if (selectedSongId) {
        setSelectedSongId("");
      }

      return;
    }

    const stillExists = visibleSongs.some((song) => song.id === selectedSongId);
    if (!stillExists) {
      setSelectedSongId(visibleSongs[0].id);
    }
  }, [selectedSongId, visibleSongs]);

  useEffect(() => {
    setRemovingSongIds((current) => current.filter((songId) => props.songs.some((song) => song.id === songId)));
  }, [props.songs]);

  async function deleteSong(songId: string) {
    setDeleteMessage("");
    setRemovingSongIds((current) => [...current, songId]);
    if (selectedSongId === songId) {
      setSelectedSongId("");
      setPlayerOpen(false);
    }

    try {
      await fetchJson(`/api/songs/${songId}`, {
        method: "DELETE"
      });
      await props.onSuccess();
    } catch (error) {
      setRemovingSongIds((current) => current.filter((id) => id !== songId));
      setDeleteMessage(toReadableErrorMessage(error));
    }
  }

  return (
    <div className="single-column library-page desktop-library-page">
      <section className="library-stage">
        <div className="library-stage-header">
          <SectionTitle
            eyebrow="Library"
            title="音乐库"
            description="按歌名与封面查看歌曲。删除会同步移除对应任务记录。"
          />
        </div>
        {deleteMessage ? <div className="inline-message">{deleteMessage}</div> : null}
        {visibleSongs.length === 0 ? (
          <EmptyState text="当前没有歌曲记录。" />
        ) : (
          <div className="library-grid library-grid-page">
            {visibleSongs.map((song) => (
              <article
                className={cx("song-card", selectedSongId === song.id && "song-card-active")}
                key={song.id}
                onClick={() => {
                  setSelectedSongId(song.id);
                  setPlayerOpen(true);
                }}
              >
                <img alt={song.title} className="cover-image" src={song.coverUrl ?? undefined} />
                <button
                  className="song-delete"
                  disabled={removingSongIds.includes(song.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteSong(song.id);
                  }}
                  type="button"
                >
                  {removingSongIds.includes(song.id) ? "删除中" : "删除"}
                </button>
                <div className="song-card-overlay">
                  <div className="song-card-title">
                    <strong>{song.title}</strong>
                    <Tag tone={song.status === "ready" ? "success" : "default"}>
                      {songStatusLabel(song.status)}
                    </Tag>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedSong && playerOpen ? (
        <PlayerOverlay song={selectedSong} onClose={() => setPlayerOpen(false)} />
      ) : null}
    </div>
  );
}

function CoverStudioPage(props: { songs: Song[]; onSuccess: () => Promise<void> }) {
  const [coverPrompt, setCoverPrompt] = useState("电影感夜景封面，霓虹、雨夜、城市远景");
  const [selectedSongId, setSelectedSongId] = useState("");
  const selectedSong = props.songs.find((song) => song.id === selectedSongId);

  useEffect(() => {
    if (!props.songs.length) {
      if (selectedSongId) {
        setSelectedSongId("");
      }

      return;
    }

    const stillExists = props.songs.some((song) => song.id === selectedSongId);
    if (!stillExists) {
      setSelectedSongId(props.songs[0].id);
    }
  }, [props.songs, selectedSongId]);

  async function generateCover() {
    if (!selectedSongId) {
      return;
    }

    await fetchJson("/api/covers", {
      method: "POST",
      body: JSON.stringify({
        songId: selectedSongId,
        prompt: coverPrompt
      })
    });
    await props.onSuccess();
  }

  return (
    <div className="two-column cover-page">
      <Panel>
        <SectionTitle
          eyebrow="Cover"
          title="封面生成"
          description="封面单独维护，不再和音乐库混在同一页。"
        />
        {selectedSong ? (
          <div className="selected-song">
            <img alt={selectedSong.title} className="selected-song-cover" src={selectedSong.coverUrl ?? undefined} />
            <div>
              <strong>{selectedSong.title}</strong>
              <p>{selectedSong.lyricsSnippet || "当前还没有歌词返回。可先生成歌曲后再补图。"}</p>
            </div>
          </div>
        ) : null}
        <div className="form-grid">
          <label>
            选择歌曲
            <select
              disabled={!props.songs.length}
              value={selectedSongId}
              onChange={(event) => setSelectedSongId(event.target.value)}
            >
              {!props.songs.length ? <option value="">请先生成歌曲</option> : null}
              {props.songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                </option>
              ))}
            </select>
          </label>
          <label className="full-span">
            封面描述
            <textarea
              rows={5}
              value={coverPrompt}
              onChange={(event) => setCoverPrompt(event.target.value)}
            />
          </label>
        </div>
        <button
          className="primary-button"
          disabled={!selectedSongId}
          onClick={() => void generateCover()}
          type="button"
        >
          生成封面
        </button>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Preview"
          title="封面预览"
          description="这里展示当前选中的歌曲封面和已返回的歌词片段。"
        />
        {selectedSong ? (
          <div className="cover-preview-panel">
            <img alt={selectedSong.title} className="cover-preview-image" src={selectedSong.coverUrl ?? undefined} />
            <div className="stack-list">
              <article className="list-card">
                <div>
                  <strong>{selectedSong.title}</strong>
                  <p>{selectedSong.mode}</p>
                </div>
                <Tag tone={selectedSong.status === "ready" ? "success" : "default"}>{selectedSong.status}</Tag>
              </article>
              <article className="lyric-card">
                <strong>歌词片段</strong>
                <p>{selectedSong.lyricsSnippet || "当前还没有歌词返回。"}</p>
              </article>
            </div>
          </div>
        ) : (
          <EmptyState text="请先在左侧选择歌曲。" />
        )}
      </Panel>
    </div>
  );
}

function PlayerOverlay(props: { song: Song; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(props.song.durationSeconds ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const syncTime = () => setCurrentTime(audio.currentTime);
    const syncMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const syncEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", syncMeta);
    audio.addEventListener("ended", syncEnded);

    return () => {
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", syncMeta);
      audio.removeEventListener("ended", syncEnded);
    };
  }, [props.song.audioUrl]);

  function formatTime(value: number) {
    const safe = Math.max(0, Math.floor(value));
    const minutes = Math.floor(safe / 60);
    const seconds = String(safe % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !props.song.audioUrl) {
      return;
    }

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }

  function handleSeek(nextValue: number) {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = nextValue;
    setCurrentTime(nextValue);
  }

  return (
    <div className="player-overlay" role="dialog" aria-modal="true">
      <div className="desktop-player">
        <div className="desktop-player-topbar">
          <button className="player-close" onClick={props.onClose} type="button">
            返回音乐库
          </button>
          <div className="desktop-player-window">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="desktop-player-body">
          <div className="desktop-player-left">
            <div className="desktop-player-turntable">
              <div className="desktop-player-disc">
                <img alt={props.song.title} className="desktop-player-cover" src={props.song.coverUrl ?? undefined} />
              </div>
            </div>
          </div>
          <div className="desktop-player-right">
          <div className="player-copy">
            <div className="player-title-row">
              <h3>{props.song.title}</h3>
              <Tag tone={props.song.status === "ready" ? "success" : "default"}>
                {songStatusLabel(props.song.status)}
              </Tag>
            </div>
            <p className="player-artist">AI Music Library</p>
          </div>
            <div className="lyrics-panel">
              <strong>歌词</strong>
              <div className="lyrics-scroll">
                <p>{props.song.lyricsSnippet || "当前还没有歌词返回。"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="desktop-player-bottom">
          <div className="player-meta-row">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            className="player-slider"
            disabled={!props.song.audioUrl}
            max={duration || 0}
            min={0}
            onChange={(event) => handleSeek(Number(event.target.value))}
            type="range"
            value={Math.min(currentTime, duration || 0)}
          />
          <div className="player-controls desktop-player-controls">
            <button className="ghost-button player-secondary" type="button">
              循环
            </button>
            <button
              className="player-main-button"
              disabled={!props.song.audioUrl}
              onClick={() => void togglePlayback()}
              type="button"
            >
              {isPlaying ? "暂停" : "播放"}
            </button>
            <button className="ghost-button player-secondary" type="button">
              列表
            </button>
          </div>
          <div className="player-stats">
            <span>{props.song.audioUrl ? "音频可播放" : "等待音频返回"}</span>
            <span>{props.song.durationSeconds ? `${props.song.durationSeconds}s` : "未返回时长"}</span>
          </div>
        </div>
        <audio key={props.song.id} ref={audioRef} src={props.song.audioUrl ?? undefined} />
      </div>
    </div>
  );
}

function TasksPage(props: { tasks: SongTask[]; onSuccess: () => Promise<void> }) {
  const sortedTasks = [...props.tasks].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  const [taskMessage, setTaskMessage] = useState("");
  const [busyTaskIds, setBusyTaskIds] = useState<string[]>([]);

  async function refreshTask(taskId: string) {
    setBusyTaskIds((current) => [...current, taskId]);
    setTaskMessage("");
    try {
      await fetchJson(`/api/tasks/${taskId}/refresh`, {
        method: "POST"
      });
      await props.onSuccess();
    } catch (error) {
      setTaskMessage(toReadableErrorMessage(error));
    } finally {
      setBusyTaskIds((current) => current.filter((id) => id !== taskId));
    }
  }

  async function retryTask(taskId: string) {
    setBusyTaskIds((current) => [...current, taskId]);
    setTaskMessage("");
    try {
      await fetchJson(`/api/tasks/${taskId}/retry`, {
        method: "POST"
      });
      await props.onSuccess();
      setTaskMessage("已基于失败任务重新创建新的歌曲任务。");
    } catch (error) {
      setTaskMessage(toReadableErrorMessage(error));
    } finally {
      setBusyTaskIds((current) => current.filter((id) => id !== taskId));
    }
  }

  async function deleteFailedTask(taskId: string) {
    setBusyTaskIds((current) => [...current, taskId]);
    setTaskMessage("");
    try {
      await fetchJson(`/api/tasks/${taskId}`, {
        method: "DELETE"
      });
      await props.onSuccess();
      setTaskMessage("失败任务已删除。");
    } catch (error) {
      setTaskMessage(toReadableErrorMessage(error));
    } finally {
      setBusyTaskIds((current) => current.filter((id) => id !== taskId));
    }
  }

  return (
    <div className="single-column tasks-page">
      <section className="task-stage">
        <div className="task-stage-header">
          <SectionTitle
            eyebrow="Tasks"
            title="任务中心"
            description="所有歌曲生成都会进入统一状态机。排队中表示任务已提交给 provider，但还在等待开始生成。"
          />
        </div>
        <div className="task-summary">
          <Metric title="总任务" value={String(props.tasks.length)} />
          <Metric
            title="成功"
            value={String(props.tasks.filter((task) => task.status === "succeeded").length)}
          />
          <Metric
            title="处理中"
            value={String(sortedTasks.filter((task) => task.status === "queued" || task.status === "running").length)}
          />
        </div>
        {taskMessage ? <div className="inline-message">{taskMessage}</div> : null}
        <div className="task-list-page">
          {sortedTasks.length === 0 ? (
            <EmptyState text="当前没有任务。" />
          ) : (
            sortedTasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.progressLabel}</p>
                  <small>{task.providerTaskId ?? "等待 provider task id"}</small>
                  {task.errorMessage ? <small className="task-error">{task.errorMessage}</small> : null}
                </div>
                <div className="task-actions">
                  <Tag tone={task.status === "succeeded" ? "success" : "default"}>
                    {taskStatusLabel(task.status)}
                  </Tag>
                  <button
                    className="ghost-button"
                    disabled={busyTaskIds.includes(task.id)}
                    onClick={() => void refreshTask(task.id)}
                    type="button"
                  >
                    查询状态
                  </button>
                  {task.status === "failed" ? (
                    <>
                      <button
                        className="ghost-button"
                        disabled={busyTaskIds.includes(task.id)}
                        onClick={() => void retryTask(task.id)}
                        type="button"
                      >
                        重试任务
                      </button>
                      <button
                        className="ghost-button"
                        disabled={busyTaskIds.includes(task.id)}
                        onClick={() => void deleteFailedTask(task.id)}
                        type="button"
                      >
                        删除失败任务
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function AccountPage(props: {
  account: AccountInfo;
  rules: GenreRule[];
  syncingAccount: boolean;
  onRefreshAccount: () => Promise<void>;
}) {
  return (
    <div className="two-column account-page">
      <Panel>
        <SectionTitle
          eyebrow="Provider"
          title="账户与余额"
          description="这里聚合 Suno credits、运行模式和回调状态。"
        />
        <div className="panel-toolbar">
          <button className="ghost-button" onClick={() => void props.onRefreshAccount()} type="button">
            {props.syncingAccount ? "同步中..." : "同步余额"}
          </button>
        </div>
        {props.account.mode === "mock" ? (
          <div className="inline-message">
            当前处于 `mock` 模式，页面中的 credits 是模拟值，不会和 Suno 后台余额一致。
          </div>
        ) : null}
        <div className="stat-row">
          <Metric title="Provider" value={props.account.provider} />
          <Metric title="Mode" value={props.account.mode} />
          <Metric title="Credits" value={String(props.account.creditsRemaining)} />
          <Metric title="Callback" value={props.account.callbackConfigured ? "On" : "Off"} />
        </div>
        <p className="footnote">最近查询时间：{props.account.lastCheckedAt ?? "尚未同步"}</p>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Rules"
          title="风格规则库"
          description="这些规则会进入文档、表单和小说成歌提示词。"
        />
        <div className="stack-list compact-scroll">
          {props.rules.map((rule) => (
            <article className="list-card" key={rule.slug}>
              <div>
                <strong>{rule.name}</strong>
                <p>{rule.arrangementNotes.join("；")}</p>
              </div>
              <Tag>{rule.bpmRange}</Tag>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SettingsPage(_props: { onSaved: () => Promise<void> }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const result = await fetchJson<AppSettings>("/api/settings");
        if (!cancelled) {
          setSettings(result);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(toReadableErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  function patchSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  const callbackEnabled = Boolean(settings?.sunoCallbackUrl.trim());

  async function saveSettings() {
    if (!settings) {
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const result = await fetchJson<AppSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(settings)
      });
      setSettings(result);
      setMessage("设置已保存，后端运行态已更新。可手动点击右上角“刷新数据”同步余额和状态。");
    } catch (error) {
      setMessage(toReadableErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="single-column settings-page">
        <Panel>
          <SectionTitle
            eyebrow="Settings"
            title="接口设置"
            description="正在加载当前运行配置。"
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="single-column settings-page">
      <Panel>
        <SectionTitle
          eyebrow="Runtime"
          title="接口设置"
          description="这里可以直接填写 Suno、DeepSeek 和火山引擎配置。保存后会持久化到服务端本地文件，并立刻作用于当前运行态。"
        />
        <div className="settings-toolbar">
          <div className="runtime-mode-card">
            <span className="toggle-label">运行模式</span>
            <div className="switch-row settings-mode-switch">
              <button
                className={cx("toggle-chip", !settings.mockMode && "toggle-chip-active")}
                onClick={() => patchSetting("mockMode", false)}
                type="button"
              >
                真实接口
              </button>
              <button
                className={cx("toggle-chip", settings.mockMode && "toggle-chip-active")}
                onClick={() => patchSetting("mockMode", true)}
                type="button"
              >
                Mock 模式
              </button>
            </div>
            <span className="field-hint">
              关闭 Mock 后，余额查询和歌曲生成会直接请求你填入的 Suno / DeepSeek 配置。
            </span>
          </div>
          <button className="primary-button" onClick={() => void saveSettings()} type="button">
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
        {message ? <div className="inline-message">{message}</div> : null}
      </Panel>

      <div className="two-column settings-grid">
        <Panel>
          <SectionTitle
            eyebrow="Suno"
            title="音乐生成接口"
            description="用于一键成歌、小说成歌、余额查询和任务状态同步。"
          />
          <div className="callback-card">
            <span className="toggle-label">Callback 回调</span>
            <div className="switch-row settings-mode-switch">
              <button
                className={cx("toggle-chip", !callbackEnabled && "toggle-chip-active")}
                onClick={() => patchSetting("sunoCallbackUrl", "")}
                type="button"
              >
                已关闭
              </button>
              <button
                className={cx("toggle-chip", callbackEnabled && "toggle-chip-active")}
                onClick={() =>
                  patchSetting(
                    "sunoCallbackUrl",
                    settings.sunoCallbackUrl || "https://your-public-domain/api/providers/suno/callback"
                  )
                }
                type="button"
              >
                启用公网回调
              </button>
            </div>
            <span className="field-hint">
              本地开发建议关闭。只有公网可访问地址才适合填在这里，`localhost` 不会被 Suno 外部服务回调到。
            </span>
          </div>
          <div className="form-grid">
            <label className="full-span">
              API Key
              <input
                type="password"
                value={settings.sunoApiKey}
                onChange={(event) => patchSetting("sunoApiKey", event.target.value)}
                placeholder="输入 Suno API Key"
              />
            </label>
            <label>
              Base URL
              <input
                value={settings.sunoBaseUrl}
                onChange={(event) => patchSetting("sunoBaseUrl", event.target.value)}
              />
            </label>
            <label>
              Callback URL
              <input
                disabled={!callbackEnabled}
                value={settings.sunoCallbackUrl}
                onChange={(event) => patchSetting("sunoCallbackUrl", event.target.value)}
                placeholder="https://your-public-domain/api/providers/suno/callback"
              />
            </label>
            <label>
              Generate Path
              <input
                value={settings.sunoGeneratePath}
                onChange={(event) => patchSetting("sunoGeneratePath", event.target.value)}
              />
            </label>
            <label>
              Details Path
              <input
                value={settings.sunoDetailsPath}
                onChange={(event) => patchSetting("sunoDetailsPath", event.target.value)}
              />
            </label>
            <label className="full-span">
              Credits Path
              <input
                value={settings.sunoCreditsPath}
                onChange={(event) => patchSetting("sunoCreditsPath", event.target.value)}
              />
            </label>
          </div>
        </Panel>

        <div className="settings-stack">
          <Panel>
            <SectionTitle
              eyebrow="LLM"
              title="DeepSeek"
              description="用于全文摘要、角色提取、小说成歌提示词规划。"
            />
            <div className="form-grid">
              <label className="full-span">
                API Key
                <input
                  type="password"
                  value={settings.deepseekApiKey}
                  onChange={(event) => patchSetting("deepseekApiKey", event.target.value)}
                  placeholder="输入 DeepSeek API Key"
                />
              </label>
              <label>
                Base URL
                <input
                  value={settings.deepseekBaseUrl}
                  onChange={(event) => patchSetting("deepseekBaseUrl", event.target.value)}
                />
              </label>
              <label>
                Model
                <input
                  value={settings.deepseekModel}
                  onChange={(event) => patchSetting("deepseekModel", event.target.value)}
                />
              </label>
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              eyebrow="Cover"
              title="火山引擎"
              description="用于封面生成。当前仍是占位适配层，但配置已经可以从这里维护。"
            />
            <div className="form-grid">
              <label className="full-span">
                Access Key
                <input
                  type="password"
                  value={settings.volcengineAccessKey}
                  onChange={(event) => patchSetting("volcengineAccessKey", event.target.value)}
                />
              </label>
              <label className="full-span">
                Secret Key
                <input
                  type="password"
                  value={settings.volcengineSecretKey}
                  onChange={(event) => patchSetting("volcengineSecretKey", event.target.value)}
                />
              </label>
              <label>
                Region
                <input
                  value={settings.volcengineRegion}
                  onChange={(event) => patchSetting("volcengineRegion", event.target.value)}
                />
              </label>
              <label>
                Model
                <input
                  value={settings.volcengineImageModel}
                  onChange={(event) => patchSetting("volcengineImageModel", event.target.value)}
                />
              </label>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function SectionTitle(props: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="section-title">
      <span>{props.eyebrow}</span>
      <h2>{props.title}</h2>
      <p>{props.description}</p>
    </div>
  );
}

function Metric(props: { title: string; value: string }) {
  return (
    <div className="metric">
      <span>{props.title}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function EmptyState(props: { text: string }) {
  return <div className="empty-state">{props.text}</div>;
}

function taskStatusLabel(status: SongTask["status"]) {
  return taskStatusTextMap[status];
}

function songStatusLabel(status: Song["status"]) {
  return songStatusTextMap[status];
}

export default App;
