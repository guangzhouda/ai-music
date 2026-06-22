import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "@ai-music/ui";
import { SectionTitle } from "../components/SectionTitle";
import { fetchJson } from "../hooks/useApi";
import { buildStyleText, toReadableErrorMessage } from "../data/utils";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
import { NovelImportSection } from "../components/NovelImportSection";
import { NovelModeSelector } from "../components/NovelModeSelector";
import { NovelDraftReview } from "../components/NovelDraftReview";
import { sunoModelOptions, vocalGenderOptions, getNovelModeLabel } from "../data/options";
export function NovelStudioPage(props) {
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
    function fallbackNovelTitle() {
        if (!activeDocument) {
            return "";
        }
        return `${activeDocument.title} · ${getNovelModeLabel(mode)}${makeInstrumental ? " · 纯音乐" : ""}`;
    }
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
            setImportMessage(`已导入文本:${document.title}`);
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
            setImportMessage(`已导入文件:${document.title}`);
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
            setDraftTitle(draft.title.trim().length >= 2 ? draft.title : fallbackNovelTitle());
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
    return (_jsxs("div", { className: "single-column novel-page", children: [_jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Import", title: "\u5BFC\u5165\u5168\u6587", description: "\u540E\u7AEF\u4F1A\u81EA\u52A8\u5207\u5757\u3001\u751F\u6210\u6458\u8981\u548C\u5173\u952E\u8BCD\uFF0C\u4F5C\u4E3A\u5C0F\u8BF4\u6210\u6B4C\u7684\u77E5\u8BC6\u5E95\u5EA7\u3002" }), _jsx(NovelImportSection, { title: title, text: text, selectedFile: selectedFile, fileInputKey: fileInputKey, importing: importing, uploading: uploading, importMessage: importMessage, documents: props.documents, documentId: documentId, onTitleChange: setTitle, onTextChange: setText, onImportDocument: importDocument, onFileSelect: (f) => setSelectedFile(f), onImportFile: importFile, onSelectDocument: setDocumentId })] }), _jsxs(Panel, { children: [_jsx(SectionTitle, { eyebrow: "Generate", title: "\u5C0F\u8BF4\u6210\u6B4C", description: "\u5148\u6839\u636E\u5168\u6587\u548C\u8282\u9009\u751F\u6210 Suno \u63D0\u793A\u8BCD\u8349\u7A3F\uFF0C\u518D\u624B\u52A8\u4FEE\u6539\u540E\u63D0\u4EA4\u3002" }), _jsxs("div", { className: "inline-message", children: ["\u6458\u8981\u3001\u89D2\u8272\u63D0\u53D6\u548C\u5C0F\u8BF4\u6210\u6B4C\u8349\u7A3F\u4F7F\u7528\u7684 DeepSeek \u7CFB\u7EDF\u63D0\u793A\u8BCD\uFF0C\u5DF2\u96C6\u4E2D\u653E\u5230", " ", _jsx(Link, { className: "inline-link", to: "/assets", children: "\u8D44\u4EA7\u5E93" }), " ", "\u91CC\u7EF4\u62A4\u3002"] }), _jsx(NovelModeSelector, { mode: mode, makeInstrumental: makeInstrumental, onModeChange: setMode, onInstrumentalChange: setMakeInstrumental }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["\u9009\u62E9\u6587\u6863", _jsxs("select", { value: documentId, onChange: (event) => setDocumentId(event.target.value), children: [!props.documents.length ? _jsx("option", { value: "", children: "\u8BF7\u5148\u5728\u5DE6\u4FA7\u5BFC\u5165\u6587\u6863" }) : null, props.documents.map((document) => (_jsx("option", { value: document.id, children: document.title }, document.id)))] }), !props.documents.length ? _jsx("span", { className: "field-hint", children: "\u5BFC\u5165\u6210\u529F\u540E\uFF0C\u8FD9\u91CC\u4F1A\u81EA\u52A8\u5207\u6362\u5230\u6700\u65B0\u6587\u6863\u3002" }) : null] }), _jsxs("label", { children: ["\u98CE\u683C", _jsx("select", { value: styleRuleSlug, onChange: (event) => setStyleRuleSlug(event.target.value), children: props.rules.map((rule) => (_jsx("option", { value: rule.slug, children: rule.name }, rule.slug))) })] }), _jsxs("label", { children: ["\u6A21\u578B", _jsx("select", { value: model, onChange: (event) => setModel(event.target.value), children: sunoModelOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("label", { className: "full-span", children: ["\u805A\u7126\u5185\u5BB9", _jsx("textarea", { value: focus, rows: 3, onChange: (event) => setFocus(event.target.value) })] }), _jsxs("label", { className: "full-span", children: ["\u98CE\u683C\u8865\u5145", _jsx("textarea", { value: customStyleNotes, rows: 3, onChange: (event) => setCustomStyleNotes(event.target.value), placeholder: "\u4F8B\u5982\uFF1A\u66F4\u5F3A\u8C03\u5BBF\u547D\u611F\u3001\u5973\u58F0\u4E3B\u5531\u3001\u4E3B\u6B4C\u66F4\u8F7B\uFF0C\u526F\u6B4C\u66F4\u70B8\u88C2\u3002" })] }), _jsxs("label", { children: ["\u4EBA\u58F0\u6027\u522B", _jsx("select", { value: vocalGender, onChange: (event) => setVocalGender(event.target.value), children: vocalGenderOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value || "auto"))) })] }), _jsxs("label", { children: ["\u53CD\u5411\u6807\u7B7E", _jsx("input", { value: negativeTags, onChange: (event) => setNegativeTags(event.target.value), placeholder: "\u4F8B\u5982\uFF1Ametal scream, noisy intro" })] }), _jsxs("label", { className: "full-span", children: ["\u8282\u9009\u5185\u5BB9\u6216\u89D2\u8272\u8BF4\u660E", _jsx("textarea", { value: excerpt, rows: 3, onChange: (event) => setExcerpt(event.target.value), placeholder: "\u53EF\u7C98\u8D34\u6BB5\u843D\u3001\u5BF9\u767D\u3001\u89D2\u8272\u4ECB\u7ECD\u7B49\u3002" })] })] }), activeDocument ? (_jsxs("div", { className: "selected-doc-summary", children: [_jsx("strong", { children: activeDocument.title }), _jsx("p", { children: activeDocument.summary })] })) : null, draftMessage ? _jsx("div", { className: "inline-message", children: draftMessage }) : null, _jsx(NovelDraftReview, { draftTitle: draftTitle, draftPrompt: draftPrompt, draftStylePrompt: draftStylePrompt, draftStale: draftStale, draftLoading: draftLoading, submitting: submitting, onTitleChange: setDraftTitle, onPromptChange: setDraftPrompt, onStylePromptChange: setDraftStylePrompt, onGenerateDraft: generateDraft, onSubmit: generateNovelSong })] })] }));
}
