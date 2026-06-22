import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function SectionTitle(props) {
    return (_jsxs("div", { className: "section-title", children: [props.eyebrow ? _jsx("span", { children: props.eyebrow }) : null, _jsx("h2", { children: props.title }), props.description ? _jsx("p", { children: props.description }) : null] }));
}
