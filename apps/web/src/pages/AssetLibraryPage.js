import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Panel, Tag } from "@ai-music/ui";
import { SectionTitle } from "../components/SectionTitle";
import { fetchJson } from "../hooks/useApi";
import { toReadableErrorMessage } from "../data/utils";
const emptyPromptAssets = { updatedAt: null, assets: [] };
export function AssetLibraryPage() {
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
    return (_jsxs("div", { className: "single-column asset-page", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Assets", title: "\u63D0\u793A\u8BCD\u8D44\u4EA7\u5E93", description: "\u8FD9\u91CC\u7EF4\u62A4\u6240\u6709\u4F1A\u53D1\u7ED9 DeepSeek \u7684\u7CFB\u7EDF\u63D0\u793A\u8BCD\u3002\u5B83\u4EEC\u4E0D\u4F1A\u76F4\u63A5\u53D1\u7ED9 Suno\uFF0C\u4F46\u4F1A\u5F71\u54CD\u6458\u8981\u3001\u89D2\u8272\u63D0\u53D6\u3001\u5C0F\u8BF4\u6210\u6B4C\u63D0\u793A\u8BCD\u8349\u7A3F\u548C\u6700\u7EC8\u6B4C\u8BCD\u5185\u5BB9\u3002\u5EFA\u8BAE\u660E\u786E\u8981\u6C42\u89C4\u907F\u771F\u5B9E\u827A\u4EBA\u540D\u3001\u54C1\u724C\u540D\u548C\u5176\u4ED6\u654F\u611F\u8BCD\u3002" }), _jsxs("div", { className: "settings-toolbar", children: [_jsxs("div", { className: "runtime-mode-card", children: [_jsx("span", { className: "toggle-label", children: "\u5F53\u524D\u7528\u9014" }), _jsx("span", { className: "field-hint", children: "\u5BFC\u5165\u5168\u6587\u65F6\u7684\u6458\u8981\u3001\u957F\u6587\u5206\u6BB5\u5206\u6790\u3001\u5168\u6587\u6C47\u603B\u3001\u5C0F\u8BF4\u6210\u6B4C\u8349\u7A3F\u751F\u6210\uFF0C\u90FD\u4F1A\u4F7F\u7528\u4E0B\u9762\u8FD9\u4E9B\u5927\u6A21\u578B\u7CFB\u7EDF\u63D0\u793A\u8BCD\u3002" })] }), _jsx("button", { className: "primary-button", disabled: loading || saving, onClick: () => void saveAssets(), type: "button", children: saving ? "保存中..." : "保存资产" })] }), message ? _jsx("div", { className: "inline-message", children: message }) : null] }), _jsx("div", { className: "asset-grid", children: library.assets.map((asset) => (_jsxs(Panel, { children: [_jsxs("div", { className: "asset-card-header", children: [_jsxs("div", { children: [_jsx(Tag, { tone: "accent", children: asset.targetModel }), _jsx("h3", { children: asset.title })] }), _jsx("span", { className: "asset-key", children: asset.key })] }), _jsx("p", { className: "asset-description", children: asset.description }), _jsxs("label", { className: "asset-label", children: ["\u7CFB\u7EDF\u63D0\u793A\u8BCD", _jsx("textarea", { rows: 10, value: asset.systemPrompt, onChange: (event) => patchAsset(asset.key, event.target.value) })] }), _jsx("p", { className: "field-hint", children: "\u8BF4\u660E\uFF1A\u8FD9\u90E8\u5206\u662F\u53D1\u7ED9 DeepSeek \u7684 system prompt\u3002\u5B9E\u9645\u4E1A\u52A1\u6570\u636E\uFF0C\u4F8B\u5982\u5168\u6587\u6458\u8981\u3001\u89D2\u8272\u3001\u8282\u9009\u5185\u5BB9\uFF0C\u4F1A\u4F5C\u4E3A user prompt \u5728\u8FD0\u884C\u65F6\u62FC\u63A5\u3002\u8FD9\u91CC\u53EF\u4EE5\u76F4\u63A5\u52A0\u4E0A\u201C\u907F\u514D\u771F\u5B9E\u827A\u4EBA\u540D\u3001\u89C4\u907F\u654F\u611F\u8BCD\u3001\u6539\u5199\u6210\u865A\u6784\u8868\u8FBE\u201D\u7B49\u89C4\u5219\u3002" })] }, asset.key))) })] }));
}
