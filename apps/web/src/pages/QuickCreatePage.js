import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Panel } from "@ai-music/ui";
import { SectionTitle } from "../components/SectionTitle";
import { fetchJson } from "../hooks/useApi";
import { buildStyleText } from "../data/utils";
import { sunoModelOptions, vocalGenderOptions } from "../data/options";
export function QuickCreatePage(props) {
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
