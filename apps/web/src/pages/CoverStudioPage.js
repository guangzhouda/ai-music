import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Panel, Tag } from "@ai-music/ui";
import { SectionTitle } from "../components/SectionTitle";
import { EmptyState } from "../components/EmptyState";
import { fetchJson } from "../hooks/useApi";
export function CoverStudioPage(props) {
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
