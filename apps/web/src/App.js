import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { appMeta } from "@ai-music/config";
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
const sunoModelOptions = [
    { value: "V4", label: "V4" },
    { value: "V4_5", label: "V4.5" },
    { value: "V4_5PLUS", label: "V4.5+" },
    { value: "V4_5ALL", label: "V4.5 All" },
    { value: "V5", label: "V5" }
];
const vocalGenderOptions = [
    { value: "", label: "自动" },
    { value: "f", label: "女声" },
    { value: "m", label: "男声" }
];
function toReadableErrorMessage(value) {
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
        }
        catch {
            return String(value);
        }
    }
    return String(value ?? "未知错误");
}
function buildStyleText(rules, styleRuleSlug, customNotes) {
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
async function fetchJson(path, init) {
    let response;
    const headers = new Headers(init?.headers);
    if (init?.body !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    try {
        response = await fetch(`${apiBaseUrl}${path}`, {
            ...init,
            headers
        });
    }
    catch (error) {
        throw new Error(error instanceof Error && error.message.includes("Failed to fetch")
            ? "无法连接到本地后端，请确认 `npm run dev` 已启动，且 8787 端口可访问。"
            : error instanceof Error
                ? error.message
                : "网络请求失败");
    }
    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = (payload && typeof payload === "object" && "message" in payload ? payload.message : null) ??
            (payload && typeof payload === "object" && "error" in payload ? payload.error : null) ??
            `${response.status} ${response.statusText}`;
        throw new Error(toReadableErrorMessage(message));
    }
    return (await response.json());
}
const emptyOverview = {
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
const emptyPromptAssets = {
    updatedAt: null,
    assets: []
};
const taskStatusTextMap = {
    queued: "排队中",
    running: "处理中",
    succeeded: "已完成",
    failed: "失败"
};
const songStatusTextMap = {
    draft: "草稿",
    generating: "生成中",
    ready: "可播放",
    failed: "失败"
};
function App() {
    const [overview, setOverview] = useState(emptyOverview);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [syncingAccount, setSyncingAccount] = useState(false);
    async function refreshOverview() {
        try {
            setLoading(true);
            const [overviewResult, accountResult] = await Promise.allSettled([
                fetchJson("/api/overview"),
                fetchJson("/api/account")
            ]);
            if (overviewResult.status !== "fulfilled") {
                throw overviewResult.reason;
            }
            setOverview({
                ...overviewResult.value,
                account: accountResult.status === "fulfilled"
                    ? accountResult.value
                    : overviewResult.value.account
            });
            setError("");
        }
        catch (fetchError) {
            setError(toReadableErrorMessage(fetchError));
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void refreshOverview();
    }, []);
    async function refreshAccount() {
        try {
            setSyncingAccount(true);
            const account = await fetchJson("/api/account");
            setOverview((current) => ({
                ...current,
                account
            }));
            setError("");
        }
        catch (fetchError) {
            setError(toReadableErrorMessage(fetchError));
        }
        finally {
            setSyncingAccount(false);
        }
    }
    return (_jsxs("div", { className: "app-shell", children: [_jsx("div", { className: "ambient ambient-left" }), _jsx("div", { className: "ambient ambient-right" }), _jsxs("header", { className: "topbar", children: [_jsxs(Link, { className: "brand", to: "/", children: [_jsx("span", { className: "brand-mark", children: "A" }), _jsxs("div", { children: [_jsx("strong", { children: appMeta.name }), _jsx("p", { children: appMeta.tagline })] })] }), _jsx("nav", { className: "nav", children: [
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
                        ].map(([path, label]) => (_jsx(NavLink, { to: path, className: ({ isActive }) => cx("nav-link", isActive && "nav-link-active"), children: label }, path))) }), _jsx("button", { className: "ghost-button", onClick: () => void refreshOverview(), type: "button", children: "\u5237\u65B0\u6570\u636E" })] }), _jsxs("main", { className: "page", children: [error ? _jsxs("div", { className: "error-banner", children: ["\u63A5\u53E3\u9519\u8BEF\uFF1A", error] }) : null, _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, { account: overview.account, songs: overview.songs, tasks: overview.tasks, documents: overview.documents, loading: loading }) }), _jsx(Route, { path: "/quick", element: _jsx(QuickCreatePage, { onSuccess: refreshOverview, rules: overview.rules }) }), _jsx(Route, { path: "/novel", element: _jsx(NovelStudioPage, { documents: overview.documents, rules: overview.rules, onSuccess: refreshOverview }) }), _jsx(Route, { path: "/library", element: _jsx(LibraryPage, { songs: overview.songs, onSuccess: refreshOverview }) }), _jsx(Route, { path: "/cover", element: _jsx(CoverStudioPage, { songs: overview.songs, onSuccess: refreshOverview }) }), _jsx(Route, { path: "/tasks", element: _jsx(TasksPage, { tasks: overview.tasks, onSuccess: refreshOverview }) }), _jsx(Route, { path: "/account", element: _jsx(AccountPage, { account: overview.account, onRefreshAccount: refreshAccount, rules: overview.rules, syncingAccount: syncingAccount }) }), _jsx(Route, { path: "/settings", element: _jsx(SettingsPage, { onSaved: refreshOverview }) }), _jsx(Route, { path: "/assets", element: _jsx(AssetLibraryPage, {}) }), _jsx(Route, { path: "/docs", element: _jsx(DocsPage, {}) })] })] })] }));
}
function DashboardPage(props) {
    const latestSongs = props.songs.slice(0, 3);
    const latestTasks = props.tasks.slice(0, 4);
    return (_jsxs("div", { className: "single-column dashboard-page", children: [_jsxs("section", { className: "hero", children: [_jsxs("div", { className: "hero-copy", children: [_jsx(Tag, { tone: "accent", children: "Suno + \u5C0F\u8BF4\u6210\u6B4C" }), _jsx("h1", { children: "\u628A\u521B\u610F\u548C\u5267\u60C5\u76F4\u63A5\u63A8\u8FDB\u6210\u53EF\u6267\u884C\u6B4C\u66F2\u4EFB\u52A1\u3002" }), _jsx("p", { children: "\u9996\u9875\u53EA\u4FDD\u7559\u5165\u53E3\u3001\u72B6\u6001\u548C\u6700\u8FD1\u7ED3\u679C\u3002\u89C4\u5219\u5E93\u3001API \u6458\u8981\u548C\u7CFB\u7EDF\u8BBE\u8BA1\u5DF2\u7ECF\u62C6\u5230\u72EC\u7ACB\u6587\u6863\u9875\u3002" }), _jsxs("div", { className: "hero-actions", children: [_jsx(Link, { className: "primary-button", to: "/quick", children: "\u7ACB\u5373\u4E00\u952E\u6210\u6B4C" }), _jsx(Link, { className: "ghost-button", to: "/novel", children: "\u6253\u5F00\u5C0F\u8BF4\u5DE5\u4F5C\u53F0" }), _jsx(Link, { className: "ghost-button", to: "/docs", children: "\u67E5\u770B\u6587\u6863" })] })] }), _jsxs(Panel, { className: "hero-panel", children: [_jsxs("div", { className: "stat-row", children: [_jsx(Metric, { title: "\u6A21\u5F0F", value: props.account.mode === "mock" ? "Mock" : "Live" }), _jsx(Metric, { title: "\u4F59\u989D", value: String(props.account.creditsRemaining) }), _jsx(Metric, { title: "\u6B4C\u66F2", value: String(props.songs.length) }), _jsx(Metric, { title: "\u4EFB\u52A1", value: String(props.tasks.length) })] }), _jsxs("div", { className: "entry-grid", children: [_jsxs(Link, { className: "feature-card feature-link", to: "/quick", children: [_jsx("strong", { children: "\u4E00\u952E\u6210\u6B4C" }), _jsx("p", { children: "\u4ECE\u4E00\u53E5\u7B80\u77ED\u63CF\u8FF0\u76F4\u63A5\u521B\u5EFA Suno \u4EFB\u52A1\u3002" })] }), _jsxs(Link, { className: "feature-card feature-link", to: "/novel", children: [_jsx("strong", { children: "\u5C0F\u8BF4\u6210\u6B4C" }), _jsx("p", { children: "\u6309\u5168\u6587\u3001\u8282\u9009\u3001\u89D2\u8272\u3001\u573A\u666F\u591A\u6A21\u5F0F\u751F\u6210\u3002" })] }), _jsxs(Link, { className: "feature-card feature-link", to: "/library", children: [_jsx("strong", { children: "\u97F3\u4E50\u5E93" }), _jsx("p", { children: "\u7EDF\u4E00\u67E5\u770B\u6B4C\u66F2\u3001\u5C01\u9762\u3001\u97F3\u9891\u548C\u6765\u6E90\u3002" })] }), _jsxs(Link, { className: "feature-card feature-link", to: "/docs", children: [_jsx("strong", { children: "\u6587\u6863" }), _jsx("p", { children: "\u67E5\u770B API \u6458\u8981\u3001\u98CE\u683C\u89C4\u5219\u548C\u7CFB\u7EDF\u8BBE\u8BA1\u3002" })] })] })] })] }), _jsxs("div", { className: "two-column dashboard-lower", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Recent", title: "\u6700\u8FD1\u751F\u6210", description: props.loading ? "正在加载当前工作台数据。" : "展示最近的歌曲结果。" }), _jsx("div", { className: "stack-list compact-scroll", children: latestSongs.length === 0 ? (_jsx(EmptyState, { text: "\u8FD8\u6CA1\u6709\u6B4C\u66F2\uFF0C\u5148\u53BB\u4E00\u952E\u6210\u6B4C\u6216\u5BFC\u5165\u5C0F\u8BF4\u3002" })) : (latestSongs.map((song) => (_jsxs("article", { className: "list-card", children: [_jsxs("div", { children: [_jsx("strong", { children: song.title }), _jsx("p", { children: song.prompt.slice(0, 88) })] }), _jsx(Tag, { tone: song.status === "ready" ? "success" : "default", children: song.status })] }, song.id)))) })] }), _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Tasks", title: "\u6700\u8FD1\u4EFB\u52A1", description: "\u7EDF\u4E00\u72B6\u6001\u673A\u8D1F\u8D23\u63D0\u4EA4\u3001\u8F6E\u8BE2\u548C\u56DE\u8C03\u540E\u7684\u7ED3\u679C\u66F4\u65B0\u3002" }), _jsx("div", { className: "stack-list compact-scroll", children: latestTasks.length === 0 ? (_jsx(EmptyState, { text: "\u5F53\u524D\u8FD8\u6CA1\u6709\u4EFB\u52A1\u3002" })) : (latestTasks.map((task) => (_jsxs("article", { className: "list-card", children: [_jsxs("div", { children: [_jsx("strong", { children: task.title }), _jsx("p", { children: task.progressLabel })] }), _jsx(Tag, { tone: task.status === "succeeded" ? "success" : "default", children: task.status })] }, task.id)))) })] }), _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Knowledge", title: "\u5DF2\u5BFC\u5165\u6587\u6863", description: "\u8FD9\u91CC\u53EA\u4FDD\u7559\u6587\u6863\u72B6\u6001\u6982\u89C8\u3002" }), _jsx("div", { className: "stack-list compact-scroll", children: props.documents.length === 0 ? (_jsx(EmptyState, { text: "\u8FD8\u6CA1\u6709\u5BFC\u5165\u6587\u672C\u3002" })) : (props.documents.slice(0, 4).map((document) => (_jsxs("article", { className: "list-card", children: [_jsxs("div", { children: [_jsx("strong", { children: document.title }), _jsx("p", { children: document.summary })] }), _jsxs(Tag, { children: [document.chunks.length, " chunks"] })] }, document.id)))) })] })] })] }));
}
function DocsPage() {
    return (_jsxs("div", { className: "two-column docs-page", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Docs", title: "\u9879\u76EE\u6587\u6863", description: "\u96C6\u4E2D\u67E5\u770B\u5916\u90E8 API \u6458\u8981\u3001\u98CE\u683C\u89C4\u5219\u548C\u7CFB\u7EDF\u8BBE\u8BA1\uFF0C\u4E0D\u518D\u4E0E\u9996\u9875\u5185\u5BB9\u6DF7\u5728\u4E00\u8D77\u3002" }), _jsx("div", { className: "docs-grid", children: docsCatalog.map((docItem) => (_jsxs("article", { className: "doc-card", children: [_jsx(Tag, { children: docItem.category }), _jsx("strong", { children: docItem.title }), _jsx("p", { children: docItem.description }), docItem.href === "#" ? (_jsx("span", { className: "doc-hint", children: "\u5BF9\u5E94\u6B63\u5F0F\u5185\u5BB9\u5DF2\u4FDD\u5B58\u5728\u4ED3\u5E93 `doc/` \u76EE\u5F55\u3002" })) : (_jsx("a", { className: "doc-link", href: docItem.href, rel: "noreferrer", target: "_blank", children: "\u6253\u5F00\u53C2\u8003\u94FE\u63A5" }))] }, docItem.id))) })] }), _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Repo Docs", title: "\u4ED3\u5E93\u5185\u6587\u6863\u6587\u4EF6", description: "\u4EE5\u4E0B\u6587\u4EF6\u662F\u9879\u76EE\u4E2D\u7684\u6B63\u5F0F\u6587\u6863\u843D\u70B9\u3002" }), _jsx("div", { className: "stack-list compact-scroll", children: [
                            "doc/suno-api-summary.md",
                            "doc/volcengine-cover-api.md",
                            "doc/music-style-rules.md",
                            "doc/novel-to-song-design.md",
                            "doc/system-architecture.md",
                            "README.md"
                        ].map((file) => (_jsxs("article", { className: "list-card", children: [_jsxs("div", { children: [_jsx("strong", { children: file }), _jsx("p", { children: "\u4ED3\u5E93\u5185\u7684\u6B63\u5F0F\u6587\u6863\u6587\u4EF6\u3002" })] }), _jsx(Tag, { children: "Local" })] }, file))) })] })] }));
}
function AssetLibraryPage() {
    const [library, setLibrary] = useState(emptyPromptAssets);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    useEffect(() => {
        let cancelled = false;
        async function loadAssets() {
            try {
                const result = await fetchJson("/api/prompt-assets");
                if (!cancelled) {
                    setLibrary(result);
                }
            }
            catch (error) {
                if (!cancelled) {
                    setMessage(toReadableErrorMessage(error));
                }
            }
            finally {
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
    function patchAsset(key, systemPrompt) {
        setLibrary((current) => ({
            ...current,
            assets: current.assets.map((asset) => (asset.key === key ? { ...asset, systemPrompt } : asset))
        }));
    }
    async function saveAssets() {
        setSaving(true);
        setMessage("");
        try {
            const result = await fetchJson("/api/prompt-assets", {
                method: "PUT",
                body: JSON.stringify(library)
            });
            setLibrary(result);
            setMessage("资产库已保存。后续 DeepSeek 摘要、角色提取和小说成歌都会使用这里的系统提示词。");
        }
        catch (error) {
            setMessage(toReadableErrorMessage(error));
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("div", { className: "single-column asset-page", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Assets", title: "\u63D0\u793A\u8BCD\u8D44\u4EA7\u5E93", description: "\u8FD9\u91CC\u7EF4\u62A4\u6240\u6709\u4F1A\u53D1\u7ED9 DeepSeek \u7684\u7CFB\u7EDF\u63D0\u793A\u8BCD\u3002\u5B83\u4EEC\u4E0D\u4F1A\u76F4\u63A5\u53D1\u7ED9 Suno\uFF0C\u4F46\u4F1A\u5F71\u54CD\u6458\u8981\u3001\u89D2\u8272\u63D0\u53D6\u3001\u5C0F\u8BF4\u6210\u6B4C\u63D0\u793A\u8BCD\u8349\u7A3F\u548C\u6700\u7EC8\u6B4C\u8BCD\u5185\u5BB9\u3002" }), _jsxs("div", { className: "settings-toolbar", children: [_jsxs("div", { className: "runtime-mode-card", children: [_jsx("span", { className: "toggle-label", children: "\u5F53\u524D\u7528\u9014" }), _jsx("span", { className: "field-hint", children: "\u5BFC\u5165\u5168\u6587\u65F6\u7684\u6458\u8981\u3001\u957F\u6587\u5206\u6BB5\u5206\u6790\u3001\u5168\u6587\u6C47\u603B\u3001\u5C0F\u8BF4\u6210\u6B4C\u8349\u7A3F\u751F\u6210\uFF0C\u90FD\u4F1A\u4F7F\u7528\u4E0B\u9762\u8FD9\u4E9B\u5927\u6A21\u578B\u7CFB\u7EDF\u63D0\u793A\u8BCD\u3002" })] }), _jsx("button", { className: "primary-button", disabled: loading || saving, onClick: () => void saveAssets(), type: "button", children: saving ? "保存中..." : "保存资产" })] }), message ? _jsx("div", { className: "inline-message", children: message }) : null] }), _jsx("div", { className: "asset-grid", children: library.assets.map((asset) => (_jsxs(Panel, { children: [_jsxs("div", { className: "asset-card-header", children: [_jsxs("div", { children: [_jsx(Tag, { tone: "accent", children: asset.targetModel }), _jsx("h3", { children: asset.title })] }), _jsx("span", { className: "asset-key", children: asset.key })] }), _jsx("p", { className: "asset-description", children: asset.description }), _jsxs("label", { className: "asset-label", children: ["\u7CFB\u7EDF\u63D0\u793A\u8BCD", _jsx("textarea", { rows: 10, value: asset.systemPrompt, onChange: (event) => patchAsset(asset.key, event.target.value) })] }), _jsx("p", { className: "field-hint", children: "\u8BF4\u660E\uFF1A\u8FD9\u90E8\u5206\u662F\u53D1\u7ED9 DeepSeek \u7684 system prompt\u3002\u5B9E\u9645\u4E1A\u52A1\u6570\u636E\uFF0C\u4F8B\u5982\u5168\u6587\u6458\u8981\u3001\u89D2\u8272\u3001\u8282\u9009\u5185\u5BB9\uFF0C\u4F1A\u4F5C\u4E3A user prompt \u5728\u8FD0\u884C\u65F6\u62FC\u63A5\u3002" })] }, asset.key))) })] }));
}
function QuickCreatePage(props) {
    const [title, setTitle] = useState("夜航城市");
    const [prompt, setPrompt] = useState("写一首关于凌晨城市、霓虹和独自赶路的华语流行歌曲");
    const [styleRuleSlug, setStyleRuleSlug] = useState(props.rules[0]?.slug ?? "mandopop-cinematic");
    const [customStyleNotes, setCustomStyleNotes] = useState("");
    const [makeInstrumental, setMakeInstrumental] = useState(false);
    const [model, setModel] = useState("V4_5ALL");
    const [negativeTags, setNegativeTags] = useState("");
    const [vocalGender, setVocalGender] = useState("");
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
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsx("div", { className: "single-column quick-page", children: _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Quick Create", title: "\u4E00\u952E\u6210\u6B4C", description: "\u8F93\u5165\u4E00\u53E5\u9700\u6C42\uFF0C\u7CFB\u7EDF\u4F1A\u7EC4\u7EC7\u6807\u9898\u3001\u98CE\u683C\u548C\u63D0\u793A\u8BCD\u540E\u63D0\u4EA4\u5230 Suno\u3002" }), _jsxs("div", { className: "quick-layout", children: [_jsxs("div", { className: "form-grid no-margin", children: [_jsxs("label", { children: ["\u6807\u9898", _jsx("input", { value: title, onChange: (event) => setTitle(event.target.value) })] }), _jsxs("label", { children: ["\u98CE\u683C\u89C4\u5219", _jsx("select", { value: styleRuleSlug, onChange: (event) => setStyleRuleSlug(event.target.value), children: props.rules.map((rule) => (_jsx("option", { value: rule.slug, children: rule.name }, rule.slug))) })] }), _jsxs("label", { children: ["\u6A21\u578B", _jsx("select", { value: model, onChange: (event) => setModel(event.target.value), children: sunoModelOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("label", { className: "full-span", children: ["\u63D0\u4EA4\u7ED9 Suno \u7684\u6B4C\u8BCD/\u5185\u5BB9\u63D0\u793A\u8BCD", _jsx("textarea", { value: prompt, onChange: (event) => setPrompt(event.target.value), rows: 4 }), _jsx("span", { className: "field-hint", children: "\u8FD9\u91CC\u7684\u5185\u5BB9\u4F1A\u76F4\u63A5\u63D0\u4EA4\u7ED9 Suno\u3002\u4EBA\u58F0\u6B4C\u66F2\u573A\u666F\u4E0B\uFF0C\u5B83\u901A\u5E38\u4F1A\u540C\u65F6\u5F71\u54CD\u6B4C\u8BCD\u3001\u53D9\u4E8B\u548C\u65CB\u5F8B\u8D70\u5411\u3002" })] }), _jsxs("label", { className: "full-span", children: ["\u98CE\u683C\u8865\u5145", _jsx("textarea", { value: customStyleNotes, onChange: (event) => setCustomStyleNotes(event.target.value), rows: 3, placeholder: "\u4F8B\u5982\uFF1A\u526F\u6B4C\u66F4\u5927\u5F00\u5927\u5408\uFF0C\u4E3B\u6B4C\u66F4\u514B\u5236\uFF0C\u504F\u7535\u5F71\u914D\u4E50\u3002" })] }), _jsxs("label", { children: ["\u4EBA\u58F0\u6027\u522B", _jsx("select", { value: vocalGender, onChange: (event) => setVocalGender(event.target.value), children: vocalGenderOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value || "auto"))) })] }), _jsxs("label", { children: ["\u53CD\u5411\u6807\u7B7E", _jsx("input", { value: negativeTags, onChange: (event) => setNegativeTags(event.target.value), placeholder: "\u4F8B\u5982\uFF1Ascreamo, heavy distortion" })] }), _jsxs("label", { className: "checkbox-row full-span", children: [_jsx("input", { checked: makeInstrumental, onChange: (event) => setMakeInstrumental(event.target.checked), type: "checkbox" }), "\u4EC5\u751F\u6210\u7EAF\u97F3\u4E50"] })] }), _jsxs("div", { className: "quick-side", children: [_jsxs("div", { className: "stack-list", children: [_jsx("article", { className: "list-card", children: _jsxs("div", { children: [_jsx("strong", { children: "\u6807\u9898" }), _jsx("p", { children: title || "未填写标题" })] }) }), _jsx("article", { className: "list-card", children: _jsxs("div", { children: [_jsx("strong", { children: "\u6A21\u5F0F" }), _jsx("p", { children: makeInstrumental ? "纯音乐" : "人声歌曲" })] }) }), _jsx("article", { className: "list-card", children: _jsxs("div", { children: [_jsx("strong", { children: "\u98CE\u683C" }), _jsx("p", { children: buildStyleText(props.rules, styleRuleSlug, customStyleNotes) })] }) }), _jsx("article", { className: "list-card", children: _jsxs("div", { children: [_jsx("strong", { children: "\u6A21\u578B / \u4EBA\u58F0" }), _jsxs("p", { children: [model, makeInstrumental ? " / 纯音乐" : ` / ${vocalGenderOptions.find((option) => option.value === vocalGender)?.label ?? "自动"}`] })] }) })] }), _jsx("button", { className: "primary-button quick-submit", onClick: () => void submit(), type: "button", children: submitting ? "提交中..." : "提交 Suno 任务" })] })] })] }) }));
}
function NovelStudioPage(props) {
    const [title, setTitle] = useState("未命名小说");
    const [text, setText] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [mode, setMode] = useState("novel-full");
    const [focus, setFocus] = useState("围绕主角命运和故事宿命感");
    const [styleRuleSlug, setStyleRuleSlug] = useState(props.rules[0]?.slug ?? "mandopop-cinematic");
    const [customStyleNotes, setCustomStyleNotes] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [makeInstrumental, setMakeInstrumental] = useState(false);
    const [model, setModel] = useState("V4_5ALL");
    const [negativeTags, setNegativeTags] = useState("");
    const [vocalGender, setVocalGender] = useState("");
    const [importing, setImporting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
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
            const document = await fetchJson("/api/novels/import", {
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
        }
        catch (error) {
            setImportMessage(toReadableErrorMessage(error));
        }
        finally {
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
                const payload = (await response.json().catch(() => null));
                throw new Error(toReadableErrorMessage(payload?.error ?? `${response.status} ${response.statusText}`));
            }
            const document = (await response.json());
            setDocumentId(document.id);
            setSelectedFile(null);
            setFileInputKey((current) => current + 1);
            setDraftSignature("");
            setDraftTitle("");
            setDraftPrompt("");
            setDraftStylePrompt("");
            await props.onSuccess();
            setImportMessage(`已导入文件：${document.title}`);
        }
        catch (error) {
            setImportMessage(toReadableErrorMessage(error));
        }
        finally {
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
            const draft = await fetchJson("/api/generate/novel/preview", {
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
        }
        catch (error) {
            setDraftMessage(toReadableErrorMessage(error));
        }
        finally {
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
        }
        catch (error) {
            setDraftMessage(toReadableErrorMessage(error));
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs("div", { className: "single-column novel-page", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Import", title: "\u5BFC\u5165\u5168\u6587", description: "\u540E\u7AEF\u4F1A\u81EA\u52A8\u5207\u5757\u3001\u751F\u6210\u6458\u8981\u548C\u5173\u952E\u8BCD\uFF0C\u4F5C\u4E3A\u5C0F\u8BF4\u6210\u6B4C\u7684\u77E5\u8BC6\u5E95\u5EA7\u3002" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["\u6587\u672C\u6807\u9898", _jsx("input", { value: title, onChange: (event) => setTitle(event.target.value) })] }), _jsxs("label", { className: "full-span", children: ["\u6B63\u6587", _jsx("textarea", { placeholder: "\u7C98\u8D34\u6574\u7BC7\u5C0F\u8BF4\u3001\u7AE0\u8282\u6216\u957F\u6587\u5185\u5BB9\u3002", rows: 8, value: text, onChange: (event) => setText(event.target.value) })] })] }), _jsxs("div", { className: "import-actions", children: [_jsx("button", { className: "primary-button", onClick: () => void importDocument(), type: "button", children: importing ? "导入中..." : "导入正文" }), _jsxs("div", { className: "upload-box upload-box-inline", children: [_jsx("strong", { children: "\u6587\u4EF6\u5BFC\u5165" }), _jsxs("label", { className: "file-picker", children: [_jsx("input", { accept: ".txt,.md,.docx,.pdf", onChange: (event) => setSelectedFile(event.target.files?.[0] ?? null), type: "file" }, fileInputKey), _jsx("span", { children: selectedFile ? selectedFile.name : "选择 txt / md / docx / pdf" })] }), _jsx("button", { className: "ghost-button", disabled: !selectedFile || uploading, onClick: () => void importFile(), type: "button", children: uploading ? "上传中..." : "上传并导入" })] })] }), importMessage ? _jsx("div", { className: "inline-message", children: importMessage }) : null, _jsxs("div", { className: "imported-docs", children: [_jsx("strong", { children: "\u5DF2\u5BFC\u5165\u6587\u6863" }), props.documents.length === 0 ? (_jsx("p", { className: "import-note", children: "\u5F53\u524D\u8FD8\u6CA1\u6709\u6587\u6863\u3002\u5BFC\u5165\u540E\u4F1A\u81EA\u52A8\u9009\u4E2D\u6700\u65B0\u6587\u6863\u7528\u4E8E\u4E0B\u65B9\u751F\u6210\u3002" })) : (_jsx("div", { className: "stack-list compact-scroll imported-doc-list", children: props.documents.map((document) => (_jsxs("button", { className: cx("doc-pick", documentId === document.id && "doc-pick-active"), onClick: () => setDocumentId(document.id), type: "button", children: [_jsx("span", { children: document.title }), _jsxs("small", { children: [document.chunks.length, " chunks \u00B7 ", document.characters.slice(0, 3).join("、") || "待分析"] })] }, document.id))) }))] })] }), _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Generate", title: "\u5C0F\u8BF4\u6210\u6B4C", description: "\u5148\u6839\u636E\u5168\u6587\u548C\u8282\u9009\u751F\u6210 Suno \u63D0\u793A\u8BCD\u8349\u7A3F\uFF0C\u518D\u624B\u52A8\u4FEE\u6539\u540E\u63D0\u4EA4\u3002" }), _jsxs("div", { className: "inline-message", children: ["\u6458\u8981\u3001\u89D2\u8272\u63D0\u53D6\u548C\u5C0F\u8BF4\u6210\u6B4C\u8349\u7A3F\u4F7F\u7528\u7684 DeepSeek \u7CFB\u7EDF\u63D0\u793A\u8BCD\uFF0C\u5DF2\u96C6\u4E2D\u653E\u5230", " ", _jsx(Link, { className: "inline-link", to: "/assets", children: "\u8D44\u4EA7\u5E93" }), " ", "\u91CC\u7EF4\u62A4\u3002"] }), _jsx("div", { className: "card-grid compact", children: [
                            ["novel-full", "全文成歌"],
                            ["novel-excerpt", "节选成歌"],
                            ["character-theme", "角色主题曲"],
                            ["scene-score", "场景配乐"],
                            ["style-remix", "风格重编"]
                        ].map(([value, label]) => (_jsx("button", { className: cx("mode-card", mode === value && "mode-card-active"), onClick: () => setMode(value), type: "button", children: label }, value))) }), _jsxs("div", { className: "toggle-block", children: [_jsx("span", { className: "toggle-label", children: "\u751F\u6210\u7C7B\u578B" }), _jsxs("div", { className: "switch-row", children: [_jsx("button", { className: cx("toggle-chip", !makeInstrumental && "toggle-chip-active"), onClick: () => setMakeInstrumental(false), type: "button", children: "\u751F\u6210\u4EBA\u58F0\u6B4C\u66F2" }), _jsx("button", { className: cx("toggle-chip", makeInstrumental && "toggle-chip-active"), onClick: () => setMakeInstrumental(true), type: "button", children: "\u751F\u6210\u7EAF\u97F3\u4E50" })] })] }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["\u9009\u62E9\u6587\u6863", _jsxs("select", { value: documentId, onChange: (event) => setDocumentId(event.target.value), children: [!props.documents.length ? _jsx("option", { value: "", children: "\u8BF7\u5148\u5728\u5DE6\u4FA7\u5BFC\u5165\u6587\u6863" }) : null, props.documents.map((document) => (_jsx("option", { value: document.id, children: document.title }, document.id)))] }), !props.documents.length ? (_jsx("span", { className: "field-hint", children: "\u5BFC\u5165\u6210\u529F\u540E\uFF0C\u8FD9\u91CC\u4F1A\u81EA\u52A8\u5207\u6362\u5230\u6700\u65B0\u6587\u6863\u3002" })) : null] }), _jsxs("label", { children: ["\u98CE\u683C", _jsx("select", { value: styleRuleSlug, onChange: (event) => setStyleRuleSlug(event.target.value), children: props.rules.map((rule) => (_jsx("option", { value: rule.slug, children: rule.name }, rule.slug))) })] }), _jsxs("label", { children: ["\u6A21\u578B", _jsx("select", { value: model, onChange: (event) => setModel(event.target.value), children: sunoModelOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("label", { className: "full-span", children: ["\u805A\u7126\u5185\u5BB9", _jsx("textarea", { value: focus, rows: 3, onChange: (event) => setFocus(event.target.value) })] }), _jsxs("label", { className: "full-span", children: ["\u98CE\u683C\u8865\u5145", _jsx("textarea", { value: customStyleNotes, rows: 3, onChange: (event) => setCustomStyleNotes(event.target.value), placeholder: "\u4F8B\u5982\uFF1A\u66F4\u5F3A\u8C03\u5BBF\u547D\u611F\u3001\u5973\u58F0\u4E3B\u5531\u3001\u4E3B\u6B4C\u66F4\u8F7B\uFF0C\u526F\u6B4C\u66F4\u70B8\u88C2\u3002" })] }), _jsxs("label", { children: ["\u4EBA\u58F0\u6027\u522B", _jsx("select", { value: vocalGender, onChange: (event) => setVocalGender(event.target.value), children: vocalGenderOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value || "auto"))) })] }), _jsxs("label", { children: ["\u53CD\u5411\u6807\u7B7E", _jsx("input", { value: negativeTags, onChange: (event) => setNegativeTags(event.target.value), placeholder: "\u4F8B\u5982\uFF1Ametal scream, noisy intro" })] }), _jsxs("label", { className: "full-span", children: ["\u8282\u9009\u5185\u5BB9\u6216\u89D2\u8272\u8BF4\u660E", _jsx("textarea", { value: excerpt, rows: 3, onChange: (event) => setExcerpt(event.target.value), placeholder: "\u53EF\u7C98\u8D34\u6BB5\u843D\u3001\u5BF9\u767D\u3001\u89D2\u8272\u4ECB\u7ECD\u7B49\u3002" })] })] }), activeDocument ? (_jsxs("div", { className: "selected-doc-summary", children: [_jsx("strong", { children: activeDocument.title }), _jsx("p", { children: activeDocument.summary })] })) : null, _jsxs("div", { className: "form-actions", children: [_jsx("button", { className: "ghost-button", disabled: !documentId || draftLoading, onClick: () => void generateDraft(), type: "button", children: draftLoading ? "生成草稿中..." : "先生成提示词草稿" }), _jsx("button", { className: "primary-button", disabled: !documentId || !draftPrompt.trim() || draftStale || submitting, onClick: () => void generateNovelSong(), type: "button", children: submitting ? "提交中..." : "提交到 Suno" })] }), draftStale ? (_jsx("div", { className: "inline-message", children: "\u53C2\u6570\u5DF2\u53D8\u66F4\uFF0C\u8BF7\u5148\u91CD\u65B0\u751F\u6210\u63D0\u793A\u8BCD\u8349\u7A3F\uFF0C\u518D\u63D0\u4EA4\u5230 Suno\u3002" })) : null, draftMessage ? _jsx("div", { className: "inline-message", children: draftMessage }) : null, _jsxs("div", { className: "form-grid prompt-review-grid", children: [_jsxs("label", { className: "full-span", children: ["\u6700\u7EC8\u6B4C\u540D", _jsx("input", { value: draftTitle, onChange: (event) => setDraftTitle(event.target.value), placeholder: "\u5148\u70B9\u51FB\u201C\u751F\u6210\u63D0\u793A\u8BCD\u8349\u7A3F\u201D" })] }), _jsxs("label", { className: "full-span", children: ["\u6700\u7EC8\u63D0\u4EA4\u7ED9 Suno \u7684\u6B4C\u8BCD/\u5185\u5BB9\u63D0\u793A\u8BCD", _jsx("textarea", { value: draftPrompt, rows: 10, onChange: (event) => setDraftPrompt(event.target.value), placeholder: "\u8FD9\u91CC\u4F1A\u663E\u793A AI \u57FA\u4E8E\u5168\u6587\u751F\u6210\u7684\u6B4C\u8BCD/\u5185\u5BB9\u63D0\u793A\u8BCD\uFF0C\u4F60\u53EF\u4EE5\u76F4\u63A5\u4FEE\u6539\u3002" }), _jsx("span", { className: "field-hint", children: "Suno \u4F1A\u76F4\u63A5\u4F7F\u7528\u8FD9\u91CC\u7684\u5185\u5BB9\u8FDB\u884C\u6B4C\u66F2\u751F\u6210\u3002\u5BF9\u4EBA\u58F0\u6B4C\u66F2\u6765\u8BF4\uFF0C\u8FD9\u4E00\u6BB5\u901A\u5E38\u4F1A\u5F3A\u70C8\u5F71\u54CD\u6B4C\u8BCD\u548C\u53D9\u4E8B\u3002" })] }), _jsxs("label", { className: "full-span", children: ["\u6700\u7EC8\u63D0\u4EA4\u7ED9 Suno \u7684\u98CE\u683C\u63D0\u793A\u8BCD", _jsx("textarea", { value: draftStylePrompt, rows: 4, onChange: (event) => setDraftStylePrompt(event.target.value), placeholder: "\u8FD9\u91CC\u4F1A\u663E\u793A\u6700\u7EC8\u98CE\u683C\u6587\u672C\u3002" })] })] })] })] }));
}
function LibraryPage(props) {
    const [selectedSongId, setSelectedSongId] = useState("");
    const [playerOpen, setPlayerOpen] = useState(false);
    const [removingSongIds, setRemovingSongIds] = useState([]);
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
    async function deleteSong(songId) {
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
        }
        catch (error) {
            setRemovingSongIds((current) => current.filter((id) => id !== songId));
            setDeleteMessage(toReadableErrorMessage(error));
        }
    }
    return (_jsxs("div", { className: "single-column library-page desktop-library-page", children: [_jsxs("section", { className: "library-stage", children: [_jsx("div", { className: "library-stage-header", children: _jsx(SectionTitle, { eyebrow: "Library", title: "\u97F3\u4E50\u5E93", description: "\u6309\u6B4C\u540D\u4E0E\u5C01\u9762\u67E5\u770B\u6B4C\u66F2\u3002\u5220\u9664\u4F1A\u540C\u6B65\u79FB\u9664\u5BF9\u5E94\u4EFB\u52A1\u8BB0\u5F55\u3002" }) }), deleteMessage ? _jsx("div", { className: "inline-message", children: deleteMessage }) : null, visibleSongs.length === 0 ? (_jsx(EmptyState, { text: "\u5F53\u524D\u6CA1\u6709\u6B4C\u66F2\u8BB0\u5F55\u3002" })) : (_jsx("div", { className: "library-grid library-grid-page", children: visibleSongs.map((song) => (_jsxs("article", { className: cx("song-card", selectedSongId === song.id && "song-card-active"), onClick: () => {
                                setSelectedSongId(song.id);
                                setPlayerOpen(true);
                            }, children: [_jsx("img", { alt: song.title, className: "cover-image", src: song.coverUrl ?? undefined }), _jsx("button", { className: "song-delete", disabled: removingSongIds.includes(song.id), onClick: (event) => {
                                        event.stopPropagation();
                                        void deleteSong(song.id);
                                    }, type: "button", children: removingSongIds.includes(song.id) ? "删除中" : "删除" }), _jsx("div", { className: "song-card-overlay", children: _jsxs("div", { className: "song-card-title", children: [_jsx("strong", { children: song.title }), _jsx(Tag, { tone: song.status === "ready" ? "success" : "default", children: songStatusLabel(song.status) })] }) })] }, song.id))) }))] }), selectedSong && playerOpen ? (_jsx(PlayerOverlay, { song: selectedSong, onClose: () => setPlayerOpen(false) })) : null] }));
}
function CoverStudioPage(props) {
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
    return (_jsxs("div", { className: "two-column cover-page", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Cover", title: "\u5C01\u9762\u751F\u6210", description: "\u5C01\u9762\u5355\u72EC\u7EF4\u62A4\uFF0C\u4E0D\u518D\u548C\u97F3\u4E50\u5E93\u6DF7\u5728\u540C\u4E00\u9875\u3002" }), selectedSong ? (_jsxs("div", { className: "selected-song", children: [_jsx("img", { alt: selectedSong.title, className: "selected-song-cover", src: selectedSong.coverUrl ?? undefined }), _jsxs("div", { children: [_jsx("strong", { children: selectedSong.title }), _jsx("p", { children: selectedSong.lyricsSnippet || "当前还没有歌词返回。可先生成歌曲后再补图。" })] })] })) : null, _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["\u9009\u62E9\u6B4C\u66F2", _jsxs("select", { disabled: !props.songs.length, value: selectedSongId, onChange: (event) => setSelectedSongId(event.target.value), children: [!props.songs.length ? _jsx("option", { value: "", children: "\u8BF7\u5148\u751F\u6210\u6B4C\u66F2" }) : null, props.songs.map((song) => (_jsx("option", { value: song.id, children: song.title }, song.id)))] })] }), _jsxs("label", { className: "full-span", children: ["\u5C01\u9762\u63CF\u8FF0", _jsx("textarea", { rows: 5, value: coverPrompt, onChange: (event) => setCoverPrompt(event.target.value) })] })] }), _jsx("button", { className: "primary-button", disabled: !selectedSongId, onClick: () => void generateCover(), type: "button", children: "\u751F\u6210\u5C01\u9762" })] }), _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Preview", title: "\u5C01\u9762\u9884\u89C8", description: "\u8FD9\u91CC\u5C55\u793A\u5F53\u524D\u9009\u4E2D\u7684\u6B4C\u66F2\u5C01\u9762\u548C\u5DF2\u8FD4\u56DE\u7684\u6B4C\u8BCD\u7247\u6BB5\u3002" }), selectedSong ? (_jsxs("div", { className: "cover-preview-panel", children: [_jsx("img", { alt: selectedSong.title, className: "cover-preview-image", src: selectedSong.coverUrl ?? undefined }), _jsxs("div", { className: "stack-list", children: [_jsxs("article", { className: "list-card", children: [_jsxs("div", { children: [_jsx("strong", { children: selectedSong.title }), _jsx("p", { children: selectedSong.mode })] }), _jsx(Tag, { tone: selectedSong.status === "ready" ? "success" : "default", children: selectedSong.status })] }), _jsxs("article", { className: "lyric-card", children: [_jsx("strong", { children: "\u6B4C\u8BCD\u7247\u6BB5" }), _jsx("p", { children: selectedSong.lyricsSnippet || "当前还没有歌词返回。" })] })] })] })) : (_jsx(EmptyState, { text: "\u8BF7\u5148\u5728\u5DE6\u4FA7\u9009\u62E9\u6B4C\u66F2\u3002" }))] })] }));
}
function PlayerOverlay(props) {
    const audioRef = useRef(null);
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
    function formatTime(value) {
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
    function handleSeek(nextValue) {
        const audio = audioRef.current;
        if (!audio) {
            return;
        }
        audio.currentTime = nextValue;
        setCurrentTime(nextValue);
    }
    return (_jsx("div", { className: "player-overlay", role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "desktop-player", children: [_jsxs("div", { className: "desktop-player-topbar", children: [_jsx("button", { className: "player-close", onClick: props.onClose, type: "button", children: "\u8FD4\u56DE\u97F3\u4E50\u5E93" }), _jsxs("div", { className: "desktop-player-window", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] })] }), _jsxs("div", { className: "desktop-player-body", children: [_jsx("div", { className: "desktop-player-left", children: _jsx("div", { className: "desktop-player-turntable", children: _jsx("div", { className: "desktop-player-disc", children: _jsx("img", { alt: props.song.title, className: "desktop-player-cover", src: props.song.coverUrl ?? undefined }) }) }) }), _jsxs("div", { className: "desktop-player-right", children: [_jsxs("div", { className: "player-copy", children: [_jsxs("div", { className: "player-title-row", children: [_jsx("h3", { children: props.song.title }), _jsx(Tag, { tone: props.song.status === "ready" ? "success" : "default", children: songStatusLabel(props.song.status) })] }), _jsx("p", { className: "player-artist", children: "AI Music Library" })] }), _jsxs("div", { className: "lyrics-panel", children: [_jsx("strong", { children: "\u6B4C\u8BCD" }), _jsx("div", { className: "lyrics-scroll", children: _jsx("p", { children: props.song.lyricsSnippet || "当前还没有歌词返回。" }) })] })] })] }), _jsxs("div", { className: "desktop-player-bottom", children: [_jsxs("div", { className: "player-meta-row", children: [_jsx("span", { children: formatTime(currentTime) }), _jsx("span", { children: formatTime(duration) })] }), _jsx("input", { className: "player-slider", disabled: !props.song.audioUrl, max: duration || 0, min: 0, onChange: (event) => handleSeek(Number(event.target.value)), type: "range", value: Math.min(currentTime, duration || 0) }), _jsxs("div", { className: "player-controls desktop-player-controls", children: [_jsx("button", { className: "ghost-button player-secondary", type: "button", children: "\u5FAA\u73AF" }), _jsx("button", { className: "player-main-button", disabled: !props.song.audioUrl, onClick: () => void togglePlayback(), type: "button", children: isPlaying ? "暂停" : "播放" }), _jsx("button", { className: "ghost-button player-secondary", type: "button", children: "\u5217\u8868" })] }), _jsxs("div", { className: "player-stats", children: [_jsx("span", { children: props.song.audioUrl ? "音频可播放" : "等待音频返回" }), _jsx("span", { children: props.song.durationSeconds ? `${props.song.durationSeconds}s` : "未返回时长" })] })] }), _jsx("audio", { ref: audioRef, src: props.song.audioUrl ?? undefined }, props.song.id)] }) }));
}
function TasksPage(props) {
    const sortedTasks = [...props.tasks].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
    const [taskMessage, setTaskMessage] = useState("");
    const [busyTaskIds, setBusyTaskIds] = useState([]);
    async function refreshTask(taskId) {
        setBusyTaskIds((current) => [...current, taskId]);
        setTaskMessage("");
        try {
            await fetchJson(`/api/tasks/${taskId}/refresh`, {
                method: "POST"
            });
            await props.onSuccess();
        }
        catch (error) {
            setTaskMessage(toReadableErrorMessage(error));
        }
        finally {
            setBusyTaskIds((current) => current.filter((id) => id !== taskId));
        }
    }
    async function retryTask(taskId) {
        setBusyTaskIds((current) => [...current, taskId]);
        setTaskMessage("");
        try {
            await fetchJson(`/api/tasks/${taskId}/retry`, {
                method: "POST"
            });
            await props.onSuccess();
            setTaskMessage("已基于失败任务重新创建新的歌曲任务。");
        }
        catch (error) {
            setTaskMessage(toReadableErrorMessage(error));
        }
        finally {
            setBusyTaskIds((current) => current.filter((id) => id !== taskId));
        }
    }
    async function deleteFailedTask(taskId) {
        setBusyTaskIds((current) => [...current, taskId]);
        setTaskMessage("");
        try {
            await fetchJson(`/api/tasks/${taskId}`, {
                method: "DELETE"
            });
            await props.onSuccess();
            setTaskMessage("失败任务已删除。");
        }
        catch (error) {
            setTaskMessage(toReadableErrorMessage(error));
        }
        finally {
            setBusyTaskIds((current) => current.filter((id) => id !== taskId));
        }
    }
    return (_jsx("div", { className: "single-column tasks-page", children: _jsxs("section", { className: "task-stage", children: [_jsx("div", { className: "task-stage-header", children: _jsx(SectionTitle, { eyebrow: "Tasks", title: "\u4EFB\u52A1\u4E2D\u5FC3", description: "\u6240\u6709\u6B4C\u66F2\u751F\u6210\u90FD\u4F1A\u8FDB\u5165\u7EDF\u4E00\u72B6\u6001\u673A\u3002\u6392\u961F\u4E2D\u8868\u793A\u4EFB\u52A1\u5DF2\u63D0\u4EA4\u7ED9 provider\uFF0C\u4F46\u8FD8\u5728\u7B49\u5F85\u5F00\u59CB\u751F\u6210\u3002" }) }), _jsxs("div", { className: "task-summary", children: [_jsx(Metric, { title: "\u603B\u4EFB\u52A1", value: String(props.tasks.length) }), _jsx(Metric, { title: "\u6210\u529F", value: String(props.tasks.filter((task) => task.status === "succeeded").length) }), _jsx(Metric, { title: "\u5904\u7406\u4E2D", value: String(sortedTasks.filter((task) => task.status === "queued" || task.status === "running").length) })] }), taskMessage ? _jsx("div", { className: "inline-message", children: taskMessage }) : null, _jsx("div", { className: "task-list-page", children: sortedTasks.length === 0 ? (_jsx(EmptyState, { text: "\u5F53\u524D\u6CA1\u6709\u4EFB\u52A1\u3002" })) : (sortedTasks.map((task) => (_jsxs("article", { className: "task-card", children: [_jsxs("div", { children: [_jsx("strong", { children: task.title }), _jsx("p", { children: task.progressLabel }), _jsx("small", { children: task.providerTaskId ?? "等待 provider task id" }), task.errorMessage ? _jsx("small", { className: "task-error", children: task.errorMessage }) : null] }), _jsxs("div", { className: "task-actions", children: [_jsx(Tag, { tone: task.status === "succeeded" ? "success" : "default", children: taskStatusLabel(task.status) }), _jsx("button", { className: "ghost-button", disabled: busyTaskIds.includes(task.id), onClick: () => void refreshTask(task.id), type: "button", children: "\u67E5\u8BE2\u72B6\u6001" }), task.status === "failed" ? (_jsxs(_Fragment, { children: [_jsx("button", { className: "ghost-button", disabled: busyTaskIds.includes(task.id), onClick: () => void retryTask(task.id), type: "button", children: "\u91CD\u8BD5\u4EFB\u52A1" }), _jsx("button", { className: "ghost-button", disabled: busyTaskIds.includes(task.id), onClick: () => void deleteFailedTask(task.id), type: "button", children: "\u5220\u9664\u5931\u8D25\u4EFB\u52A1" })] })) : null] })] }, task.id)))) })] }) }));
}
function AccountPage(props) {
    return (_jsxs("div", { className: "two-column account-page", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Provider", title: "\u8D26\u6237\u4E0E\u4F59\u989D", description: "\u8FD9\u91CC\u805A\u5408 Suno credits\u3001\u8FD0\u884C\u6A21\u5F0F\u548C\u56DE\u8C03\u72B6\u6001\u3002" }), _jsx("div", { className: "panel-toolbar", children: _jsx("button", { className: "ghost-button", onClick: () => void props.onRefreshAccount(), type: "button", children: props.syncingAccount ? "同步中..." : "同步余额" }) }), props.account.mode === "mock" ? (_jsx("div", { className: "inline-message", children: "\u5F53\u524D\u5904\u4E8E `mock` \u6A21\u5F0F\uFF0C\u9875\u9762\u4E2D\u7684 credits \u662F\u6A21\u62DF\u503C\uFF0C\u4E0D\u4F1A\u548C Suno \u540E\u53F0\u4F59\u989D\u4E00\u81F4\u3002" })) : null, _jsxs("div", { className: "stat-row", children: [_jsx(Metric, { title: "Provider", value: props.account.provider }), _jsx(Metric, { title: "Mode", value: props.account.mode }), _jsx(Metric, { title: "Credits", value: String(props.account.creditsRemaining) }), _jsx(Metric, { title: "Callback", value: props.account.callbackConfigured ? "On" : "Off" })] }), _jsxs("p", { className: "footnote", children: ["\u6700\u8FD1\u67E5\u8BE2\u65F6\u95F4\uFF1A", props.account.lastCheckedAt ?? "尚未同步"] })] }), _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Rules", title: "\u98CE\u683C\u89C4\u5219\u5E93", description: "\u8FD9\u4E9B\u89C4\u5219\u4F1A\u8FDB\u5165\u6587\u6863\u3001\u8868\u5355\u548C\u5C0F\u8BF4\u6210\u6B4C\u63D0\u793A\u8BCD\u3002" }), _jsx("div", { className: "stack-list compact-scroll", children: props.rules.map((rule) => (_jsxs("article", { className: "list-card", children: [_jsxs("div", { children: [_jsx("strong", { children: rule.name }), _jsx("p", { children: rule.arrangementNotes.join("；") })] }), _jsx(Tag, { children: rule.bpmRange })] }, rule.slug))) })] })] }));
}
function SettingsPage(_props) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    useEffect(() => {
        let cancelled = false;
        async function loadSettings() {
            try {
                const result = await fetchJson("/api/settings");
                if (!cancelled) {
                    setSettings(result);
                }
            }
            catch (error) {
                if (!cancelled) {
                    setMessage(toReadableErrorMessage(error));
                }
            }
            finally {
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
    function patchSetting(key, value) {
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
            const result = await fetchJson("/api/settings", {
                method: "PUT",
                body: JSON.stringify(settings)
            });
            setSettings(result);
            setMessage("设置已保存，后端运行态已更新。可手动点击右上角“刷新数据”同步余额和状态。");
        }
        catch (error) {
            setMessage(toReadableErrorMessage(error));
        }
        finally {
            setSaving(false);
        }
    }
    if (loading || !settings) {
        return (_jsx("div", { className: "single-column settings-page", children: _jsx(Panel, { children: _jsx(SectionTitle, { eyebrow: "Settings", title: "\u63A5\u53E3\u8BBE\u7F6E", description: "\u6B63\u5728\u52A0\u8F7D\u5F53\u524D\u8FD0\u884C\u914D\u7F6E\u3002" }) }) }));
    }
    return (_jsxs("div", { className: "single-column settings-page", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Runtime", title: "\u63A5\u53E3\u8BBE\u7F6E", description: "\u8FD9\u91CC\u53EF\u4EE5\u76F4\u63A5\u586B\u5199 Suno\u3001DeepSeek \u548C\u706B\u5C71\u5F15\u64CE\u914D\u7F6E\u3002\u4FDD\u5B58\u540E\u4F1A\u6301\u4E45\u5316\u5230\u670D\u52A1\u7AEF\u672C\u5730\u6587\u4EF6\uFF0C\u5E76\u7ACB\u523B\u4F5C\u7528\u4E8E\u5F53\u524D\u8FD0\u884C\u6001\u3002" }), _jsxs("div", { className: "settings-toolbar", children: [_jsxs("div", { className: "runtime-mode-card", children: [_jsx("span", { className: "toggle-label", children: "\u8FD0\u884C\u6A21\u5F0F" }), _jsxs("div", { className: "switch-row settings-mode-switch", children: [_jsx("button", { className: cx("toggle-chip", !settings.mockMode && "toggle-chip-active"), onClick: () => patchSetting("mockMode", false), type: "button", children: "\u771F\u5B9E\u63A5\u53E3" }), _jsx("button", { className: cx("toggle-chip", settings.mockMode && "toggle-chip-active"), onClick: () => patchSetting("mockMode", true), type: "button", children: "Mock \u6A21\u5F0F" })] }), _jsx("span", { className: "field-hint", children: "\u5173\u95ED Mock \u540E\uFF0C\u4F59\u989D\u67E5\u8BE2\u548C\u6B4C\u66F2\u751F\u6210\u4F1A\u76F4\u63A5\u8BF7\u6C42\u4F60\u586B\u5165\u7684 Suno / DeepSeek \u914D\u7F6E\u3002" })] }), _jsx("button", { className: "primary-button", onClick: () => void saveSettings(), type: "button", children: saving ? "保存中..." : "保存设置" })] }), message ? _jsx("div", { className: "inline-message", children: message }) : null] }), _jsxs("div", { className: "two-column settings-grid", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Suno", title: "\u97F3\u4E50\u751F\u6210\u63A5\u53E3", description: "\u7528\u4E8E\u4E00\u952E\u6210\u6B4C\u3001\u5C0F\u8BF4\u6210\u6B4C\u3001\u4F59\u989D\u67E5\u8BE2\u548C\u4EFB\u52A1\u72B6\u6001\u540C\u6B65\u3002" }), _jsxs("div", { className: "callback-card", children: [_jsx("span", { className: "toggle-label", children: "Callback \u56DE\u8C03" }), _jsxs("div", { className: "switch-row settings-mode-switch", children: [_jsx("button", { className: cx("toggle-chip", !callbackEnabled && "toggle-chip-active"), onClick: () => patchSetting("sunoCallbackUrl", ""), type: "button", children: "\u5DF2\u5173\u95ED" }), _jsx("button", { className: cx("toggle-chip", callbackEnabled && "toggle-chip-active"), onClick: () => patchSetting("sunoCallbackUrl", settings.sunoCallbackUrl || "https://your-public-domain/api/providers/suno/callback"), type: "button", children: "\u542F\u7528\u516C\u7F51\u56DE\u8C03" })] }), _jsx("span", { className: "field-hint", children: "\u672C\u5730\u5F00\u53D1\u5EFA\u8BAE\u5173\u95ED\u3002\u53EA\u6709\u516C\u7F51\u53EF\u8BBF\u95EE\u5730\u5740\u624D\u9002\u5408\u586B\u5728\u8FD9\u91CC\uFF0C`localhost` \u4E0D\u4F1A\u88AB Suno \u5916\u90E8\u670D\u52A1\u56DE\u8C03\u5230\u3002" })] }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { className: "full-span", children: ["API Key", _jsx("input", { type: "password", value: settings.sunoApiKey, onChange: (event) => patchSetting("sunoApiKey", event.target.value), placeholder: "\u8F93\u5165 Suno API Key" })] }), _jsxs("label", { children: ["Base URL", _jsx("input", { value: settings.sunoBaseUrl, onChange: (event) => patchSetting("sunoBaseUrl", event.target.value) })] }), _jsxs("label", { children: ["Callback URL", _jsx("input", { disabled: !callbackEnabled, value: settings.sunoCallbackUrl, onChange: (event) => patchSetting("sunoCallbackUrl", event.target.value), placeholder: "https://your-public-domain/api/providers/suno/callback" })] }), _jsxs("label", { children: ["Generate Path", _jsx("input", { value: settings.sunoGeneratePath, onChange: (event) => patchSetting("sunoGeneratePath", event.target.value) })] }), _jsxs("label", { children: ["Details Path", _jsx("input", { value: settings.sunoDetailsPath, onChange: (event) => patchSetting("sunoDetailsPath", event.target.value) })] }), _jsxs("label", { className: "full-span", children: ["Credits Path", _jsx("input", { value: settings.sunoCreditsPath, onChange: (event) => patchSetting("sunoCreditsPath", event.target.value) })] })] })] }), _jsxs("div", { className: "settings-stack", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "LLM", title: "DeepSeek", description: "\u7528\u4E8E\u5168\u6587\u6458\u8981\u3001\u89D2\u8272\u63D0\u53D6\u3001\u5C0F\u8BF4\u6210\u6B4C\u63D0\u793A\u8BCD\u89C4\u5212\u3002" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { className: "full-span", children: ["API Key", _jsx("input", { type: "password", value: settings.deepseekApiKey, onChange: (event) => patchSetting("deepseekApiKey", event.target.value), placeholder: "\u8F93\u5165 DeepSeek API Key" })] }), _jsxs("label", { children: ["Base URL", _jsx("input", { value: settings.deepseekBaseUrl, onChange: (event) => patchSetting("deepseekBaseUrl", event.target.value) })] }), _jsxs("label", { children: ["Model", _jsx("input", { value: settings.deepseekModel, onChange: (event) => patchSetting("deepseekModel", event.target.value) })] })] })] }), _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Cover", title: "\u706B\u5C71\u5F15\u64CE", description: "\u7528\u4E8E\u5C01\u9762\u751F\u6210\u3002\u5F53\u524D\u4ECD\u662F\u5360\u4F4D\u9002\u914D\u5C42\uFF0C\u4F46\u914D\u7F6E\u5DF2\u7ECF\u53EF\u4EE5\u4ECE\u8FD9\u91CC\u7EF4\u62A4\u3002" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { className: "full-span", children: ["Access Key", _jsx("input", { type: "password", value: settings.volcengineAccessKey, onChange: (event) => patchSetting("volcengineAccessKey", event.target.value) })] }), _jsxs("label", { className: "full-span", children: ["Secret Key", _jsx("input", { type: "password", value: settings.volcengineSecretKey, onChange: (event) => patchSetting("volcengineSecretKey", event.target.value) })] }), _jsxs("label", { children: ["Region", _jsx("input", { value: settings.volcengineRegion, onChange: (event) => patchSetting("volcengineRegion", event.target.value) })] }), _jsxs("label", { children: ["Model", _jsx("input", { value: settings.volcengineImageModel, onChange: (event) => patchSetting("volcengineImageModel", event.target.value) })] })] })] })] })] })] }));
}
function SectionTitle(props) {
    return (_jsxs("div", { className: "section-title", children: [_jsx("span", { children: props.eyebrow }), _jsx("h2", { children: props.title }), _jsx("p", { children: props.description })] }));
}
function Metric(props) {
    return (_jsxs("div", { className: "metric", children: [_jsx("span", { children: props.title }), _jsx("strong", { children: props.value })] }));
}
function EmptyState(props) {
    return _jsx("div", { className: "empty-state", children: props.text });
}
function taskStatusLabel(status) {
    return taskStatusTextMap[status];
}
function songStatusLabel(status) {
    return songStatusTextMap[status];
}
export default App;
