import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Panel, cx } from "@ai-music/ui";
import { SectionTitle } from "../components/SectionTitle";
import { fetchJson } from "../hooks/useApi";
import { toReadableErrorMessage } from "../data/utils";
export function SettingsPage(_props) {
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
    return (_jsxs("div", { className: "single-column settings-page", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Runtime", title: "\u63A5\u53E3\u8BBE\u7F6E", description: "\u8FD9\u91CC\u53EF\u4EE5\u76F4\u63A5\u586B\u5199 Suno\u3001DeepSeek \u548C\u706B\u5C71\u5F15\u64CE\u914D\u7F6E\u3002\u4FDD\u5B58\u540E\u4F1A\u6301\u4E45\u5316\u5230\u670D\u52A1\u7AEF\u672C\u5730\u6587\u4EF6\uFF0C\u5E76\u7ACB\u523B\u4F5C\u7528\u4E8E\u5F53\u524D\u8FD0\u884C\u6001\u3002" }), _jsxs("div", { className: "settings-toolbar", children: [_jsxs("div", { className: "runtime-mode-card", children: [_jsx("span", { className: "toggle-label", children: "\u8FD0\u884C\u6A21\u5F0F" }), _jsxs("div", { className: "switch-row settings-mode-switch", children: [_jsx("button", { className: cx("toggle-chip", !settings.mockMode && "toggle-chip-active"), onClick: () => patchSetting("mockMode", false), type: "button", children: "\u771F\u5B9E\u63A5\u53E3" }), _jsx("button", { className: cx("toggle-chip", settings.mockMode && "toggle-chip-active"), onClick: () => patchSetting("mockMode", true), type: "button", children: "Mock \u6A21\u5F0F" })] }), _jsx("span", { className: "field-hint", children: "\u5173\u95ED Mock \u540E\uFF0C\u4F59\u989D\u67E5\u8BE2\u548C\u6B4C\u66F2\u751F\u6210\u4F1A\u76F4\u63A5\u8BF7\u6C42\u4F60\u586B\u5165\u7684 Suno / DeepSeek \u914D\u7F6E\u3002" })] }), _jsx("button", { className: "primary-button", onClick: () => void saveSettings(), type: "button", children: saving ? "保存中..." : "保存设置" })] }), message ? _jsx("div", { className: "inline-message", children: message }) : null] }), _jsxs("div", { className: "two-column settings-grid", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Suno", title: "\u97F3\u4E50\u751F\u6210\u63A5\u53E3", description: "\u7528\u4E8E\u4E00\u952E\u6210\u6B4C\u3001\u5C0F\u8BF4\u6210\u6B4C\u3001\u4F59\u989D\u67E5\u8BE2\u548C\u4EFB\u52A1\u72B6\u6001\u540C\u6B65\u3002" }), _jsxs("div", { className: "callback-card", children: [_jsx("span", { className: "toggle-label", children: "Callback \u56DE\u8C03" }), _jsxs("div", { className: "switch-row settings-mode-switch", children: [_jsx("button", { className: cx("toggle-chip", !callbackEnabled && "toggle-chip-active"), onClick: () => patchSetting("sunoCallbackUrl", ""), type: "button", children: "\u4F7F\u7528\u672C\u5730\u5360\u4F4D\u5730\u5740" }), _jsx("button", { className: cx("toggle-chip", callbackEnabled && "toggle-chip-active"), onClick: () => patchSetting("sunoCallbackUrl", settings.sunoCallbackUrl || "https://your-public-domain/api/providers/suno/callback"), type: "button", children: "\u542F\u7528\u516C\u7F51\u56DE\u8C03" })] }), _jsx("span", { className: "field-hint", children: "\u8FD9\u4E2A provider \u5B9E\u9645\u8981\u6C42\u8BF7\u6C42\u91CC\u5E26 `callBackUrl`\u3002\u5982\u679C\u4F60\u4E0D\u586B\uFF0C\u670D\u52A1\u7AEF\u4F1A\u81EA\u52A8\u56DE\u9000\u5230\u672C\u5730\u5360\u4F4D\u5730\u5740\uFF0C\u4EC5\u7528\u4E8E\u6EE1\u8DB3\u53C2\u6570\u8981\u6C42\uFF1B\u771F\u6B63\u7684\u72B6\u6001\u66F4\u65B0\u4ECD\u7136\u4F9D\u8D56\u8F6E\u8BE2\u3002" })] }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { className: "full-span", children: ["API Key", _jsx("input", { type: "password", value: settings.sunoApiKey, onChange: (event) => patchSetting("sunoApiKey", event.target.value), placeholder: "\u8F93\u5165 Suno API Key" })] }), _jsxs("label", { children: ["Base URL", _jsx("input", { value: settings.sunoBaseUrl, onChange: (event) => patchSetting("sunoBaseUrl", event.target.value) })] }), _jsxs("label", { children: ["Callback URL", _jsx("input", { disabled: !callbackEnabled, value: settings.sunoCallbackUrl, onChange: (event) => patchSetting("sunoCallbackUrl", event.target.value), placeholder: "https://your-public-domain/api/providers/suno/callback" })] }), _jsxs("label", { children: ["Generate Path", _jsx("input", { value: settings.sunoGeneratePath, onChange: (event) => patchSetting("sunoGeneratePath", event.target.value) })] }), _jsxs("label", { children: ["Details Path", _jsx("input", { value: settings.sunoDetailsPath, onChange: (event) => patchSetting("sunoDetailsPath", event.target.value) })] }), _jsxs("label", { className: "full-span", children: ["Credits Path", _jsx("input", { value: settings.sunoCreditsPath, onChange: (event) => patchSetting("sunoCreditsPath", event.target.value) })] })] })] }), _jsxs("div", { className: "settings-stack", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "LLM", title: "DeepSeek", description: "\u7528\u4E8E\u5168\u6587\u6458\u8981\u3001\u89D2\u8272\u63D0\u53D6\u3001\u5C0F\u8BF4\u6210\u6B4C\u63D0\u793A\u8BCD\u89C4\u5212\u3002" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { className: "full-span", children: ["API Key", _jsx("input", { type: "password", value: settings.deepseekApiKey, onChange: (event) => patchSetting("deepseekApiKey", event.target.value), placeholder: "\u8F93\u5165 DeepSeek API Key" })] }), _jsxs("label", { children: ["Base URL", _jsx("input", { value: settings.deepseekBaseUrl, onChange: (event) => patchSetting("deepseekBaseUrl", event.target.value) })] }), _jsxs("label", { children: ["Model", _jsx("input", { value: settings.deepseekModel, onChange: (event) => patchSetting("deepseekModel", event.target.value) })] })] })] }), _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Cover", title: "\u706B\u5C71\u5F15\u64CE", description: "\u7528\u4E8E\u5C01\u9762\u751F\u6210\u3002\u5F53\u524D\u4ECD\u662F\u5360\u4F4D\u9002\u914D\u5C42\uFF0C\u4F46\u914D\u7F6E\u5DF2\u7ECF\u53EF\u4EE5\u4ECE\u8FD9\u91CC\u7EF4\u62A4\u3002" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { className: "full-span", children: ["Access Key", _jsx("input", { type: "password", value: settings.volcengineAccessKey, onChange: (event) => patchSetting("volcengineAccessKey", event.target.value) })] }), _jsxs("label", { className: "full-span", children: ["Secret Key", _jsx("input", { type: "password", value: settings.volcengineSecretKey, onChange: (event) => patchSetting("volcengineSecretKey", event.target.value) })] }), _jsxs("label", { children: ["Region", _jsx("input", { value: settings.volcengineRegion, onChange: (event) => patchSetting("volcengineRegion", event.target.value) })] }), _jsxs("label", { children: ["Model", _jsx("input", { value: settings.volcengineImageModel, onChange: (event) => patchSetting("volcengineImageModel", event.target.value) })] })] })] })] })] })] }));
}
