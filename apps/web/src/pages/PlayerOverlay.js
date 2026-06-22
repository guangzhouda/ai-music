import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Tag, cx } from "@ai-music/ui";
import { songStatusLabel } from "../data/options";
export function PlayerOverlay(props) {
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
    // ESC 关闭
    useEffect(() => {
        function onKey(event) {
            if (event.key === "Escape") {
                props.onClose();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [props.onClose]);
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
    return (_jsx("div", { className: "player-overlay", role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "desktop-player", children: [_jsxs("div", { className: "desktop-player-topbar", children: [_jsx("button", { className: "player-close", onClick: props.onClose, type: "button", children: _jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: "0.4rem" }, children: [_jsxs("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "19", y1: "12", x2: "5", y2: "12" }), _jsx("polyline", { points: "12 19 5 12 12 5" })] }), "\u8FD4\u56DE\u97F3\u4E50\u5E93"] }) }), _jsxs("div", { className: "desktop-player-window", "aria-hidden": "true", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] })] }), _jsxs("div", { className: "desktop-player-body", children: [_jsx("div", { className: "desktop-player-left", children: _jsx("div", { className: "desktop-player-turntable", children: _jsx("div", { className: cx("desktop-player-disc", isPlaying && "spinning"), children: _jsx("img", { alt: props.song.title, className: "desktop-player-cover", src: props.song.coverUrl ?? undefined }) }) }) }), _jsxs("div", { className: "desktop-player-right", children: [_jsxs("div", { className: "player-copy", children: [_jsxs("div", { className: "player-title-row", children: [_jsx("h3", { children: props.song.title }), _jsx(Tag, { tone: props.song.status === "ready" ? "success" : "default", children: songStatusLabel(props.song.status) })] }), _jsx("p", { className: "player-artist", children: "AI Music Library" })] }), _jsxs("div", { className: "lyrics-panel", children: [_jsx("strong", { children: "\u6B4C\u8BCD" }), _jsx("div", { className: "lyrics-scroll", children: _jsx("p", { children: props.song.lyricsSnippet || "当前还没有歌词返回。" }) })] })] })] }), _jsxs("div", { className: "desktop-player-bottom", children: [_jsxs("div", { className: "player-meta-row", children: [_jsx("span", { children: formatTime(currentTime) }), _jsx("span", { children: formatTime(duration) })] }), _jsx("input", { className: "player-slider", disabled: !props.song.audioUrl, max: duration || 0, min: 0, onChange: (event) => handleSeek(Number(event.target.value)), type: "range", value: Math.min(currentTime, duration || 0), "aria-label": "\u64AD\u653E\u8FDB\u5EA6" }), _jsxs("div", { className: "player-controls desktop-player-controls", children: [_jsx("button", { className: "ghost-button player-secondary", type: "button", "aria-label": "\u5FAA\u73AF", children: _jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: "0.4rem" }, children: [_jsxs("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("polyline", { points: "17 1 21 5 17 9" }), _jsx("path", { d: "M3 11V9a4 4 0 0 1 4-4h14" }), _jsx("polyline", { points: "7 23 3 19 7 15" }), _jsx("path", { d: "M21 13v2a4 4 0 0 1-4 4H3" })] }), "\u5FAA\u73AF"] }) }), _jsx("button", { className: "player-main-button", disabled: !props.song.audioUrl, onClick: () => void togglePlayback(), type: "button", "aria-label": isPlaying ? "暂停" : "播放", children: isPlaying ? (_jsxs("svg", { viewBox: "0 0 24 24", width: "22", height: "22", fill: "currentColor", style: { position: "relative" }, children: [_jsx("rect", { x: "6", y: "5", width: "4", height: "14", rx: "1" }), _jsx("rect", { x: "14", y: "5", width: "4", height: "14", rx: "1" })] })) : (_jsx("svg", { viewBox: "0 0 24 24", width: "22", height: "22", fill: "currentColor", style: { position: "relative", marginLeft: "3px" }, children: _jsx("polygon", { points: "6 4 20 12 6 20 6 4" }) })) }), _jsx("button", { className: "ghost-button player-secondary", type: "button", "aria-label": "\u5217\u8868", children: _jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: "0.4rem" }, children: [_jsxs("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "8", y1: "6", x2: "21", y2: "6" }), _jsx("line", { x1: "8", y1: "12", x2: "21", y2: "12" }), _jsx("line", { x1: "8", y1: "18", x2: "21", y2: "18" }), _jsx("line", { x1: "3", y1: "6", x2: "3.01", y2: "6" }), _jsx("line", { x1: "3", y1: "12", x2: "3.01", y2: "12" }), _jsx("line", { x1: "3", y1: "18", x2: "3.01", y2: "18" })] }), "\u5217\u8868"] }) })] }), _jsxs("div", { className: "player-stats", children: [_jsx("span", { children: props.song.audioUrl ? "音频可播放" : "等待音频返回" }), _jsx("span", { children: props.song.durationSeconds ? `${props.song.durationSeconds}s` : "未返回时长" })] })] }), _jsx("audio", { ref: audioRef, src: props.song.audioUrl ?? undefined }, props.song.id)] }) }));
}
