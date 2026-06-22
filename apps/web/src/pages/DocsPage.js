import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Panel, Tag } from "@ai-music/ui";
import { SectionTitle } from "../components/SectionTitle";
import { docsCatalog } from "../data/docs";
export function DocsPage() {
    return (_jsxs("div", { className: "two-column docs-page", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Docs", title: "\u9879\u76EE\u6587\u6863", description: "\u96C6\u4E2D\u67E5\u770B\u5916\u90E8 API \u6458\u8981\u3001\u98CE\u683C\u89C4\u5219\u548C\u7CFB\u7EDF\u8BBE\u8BA1\uFF0C\u4E0D\u518D\u4E0E\u9996\u9875\u5185\u5BB9\u6DF7\u5728\u4E00\u8D77\u3002" }), _jsx("div", { className: "docs-grid", children: docsCatalog.map((docItem) => (_jsxs("article", { className: "doc-card", children: [_jsx(Tag, { children: docItem.category }), _jsx("strong", { children: docItem.title }), _jsx("p", { children: docItem.description }), docItem.href === "#" ? (_jsx("span", { className: "doc-hint", children: "\u5BF9\u5E94\u6B63\u5F0F\u5185\u5BB9\u5DF2\u4FDD\u5B58\u5728\u4ED3\u5E93 `doc/` \u76EE\u5F55\u3002" })) : (_jsx("a", { className: "doc-link", href: docItem.href, rel: "noreferrer", target: "_blank", children: "\u6253\u5F00\u53C2\u8003\u94FE\u63A5" }))] }, docItem.id))) })] }), _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Repo Docs", title: "\u4ED3\u5E93\u5185\u6587\u6863\u6587\u4EF6", description: "\u4EE5\u4E0B\u6587\u4EF6\u662F\u9879\u76EE\u4E2D\u7684\u6B63\u5F0F\u6587\u6863\u843D\u70B9\u3002" }), _jsx("div", { className: "stack-list compact-scroll", children: [
                            "doc/suno-api-summary.md",
                            "doc/volcengine-cover-api.md",
                            "doc/music-style-rules.md",
                            "doc/novel-to-song-design.md",
                            "doc/system-architecture.md",
                            "README.md"
                        ].map((file) => (_jsxs("article", { className: "list-card", children: [_jsxs("div", { children: [_jsx("strong", { children: file }), _jsx("p", { children: "\u4ED3\u5E93\u5185\u7684\u6B63\u5F0F\u6587\u6863\u6587\u4EF6\u3002" })] }), _jsx(Tag, { children: "Local" })] }, file))) })] })] }));
}
