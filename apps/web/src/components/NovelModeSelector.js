import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cx } from "@ai-music/ui";
import { novelModeOptions } from "../data/options";
export function NovelModeSelector(props) {
    return (_jsxs("div", { children: [_jsx("div", { className: "card-grid compact", children: novelModeOptions.map((opt) => (_jsx("button", { className: cx("mode-card", props.mode === opt.value && "mode-card-active"), onClick: () => props.onModeChange(opt.value), type: "button", children: opt.label }, opt.value))) }), _jsxs("div", { className: "toggle-block", children: [_jsx("span", { className: "toggle-label", children: "\u751F\u6210\u7C7B\u578B" }), _jsxs("div", { className: "switch-row", children: [_jsx("button", { className: cx("toggle-chip", !props.makeInstrumental && "toggle-chip-active"), onClick: () => props.onInstrumentalChange(false), type: "button", children: "\u751F\u6210\u4EBA\u58F0\u6B4C\u66F2" }), _jsx("button", { className: cx("toggle-chip", props.makeInstrumental && "toggle-chip-active"), onClick: () => props.onInstrumentalChange(true), type: "button", children: "\u751F\u6210\u7EAF\u97F3\u4E50" })] })] })] }));
}
