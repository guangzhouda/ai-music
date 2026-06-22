import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Tag, cx } from "@ai-music/ui";
import { SectionTitle } from "../components/SectionTitle";
import { EmptyState } from "../components/EmptyState";
import { fetchJson } from "../hooks/useApi";
import { toReadableErrorMessage } from "../data/utils";
import { songStatusLabel } from "../data/options";
import { PlayerOverlay } from "./PlayerOverlay";
export function LibraryPage(props) {
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
    return (_jsxs("div", { className: "single-column library-page desktop-library-page", children: [_jsxs("section", { className: "library-stage", children: [_jsx("div", { className: "library-stage-header", children: _jsx(SectionTitle, { eyebrow: "Library", title: "\u97F3\u4E50\u5E93", description: "\u6309\u6B4C\u540D\u4E0E\u5C01\u9762\u67E5\u770B\u6B4C\u66F2\u3002Suno \u6210\u529F\u4EFB\u52A1\u4F1A\u6309\u8FD4\u56DE\u7ED3\u679C\u62C6\u6210\u4E24\u9996\u6B4C\u5206\u522B\u5165\u5E93\uFF1B\u5220\u9664\u5355\u9996\u6B4C\u66F2\u65F6\uFF0C\u4F1A\u5C3D\u91CF\u4FDD\u7559\u540C\u4EFB\u52A1\u4E0B\u7684\u53E6\u4E00\u9996\u3002" }) }), deleteMessage ? _jsx("div", { className: "inline-message", children: deleteMessage }) : null, visibleSongs.length === 0 ? (_jsx(EmptyState, { text: "\u5F53\u524D\u6CA1\u6709\u6B4C\u66F2\u8BB0\u5F55\u3002" })) : (_jsx("div", { className: "library-grid library-grid-page", children: visibleSongs.map((song) => (_jsxs("article", { className: cx("song-card", selectedSongId === song.id && "song-card-active"), onClick: () => {
                                setSelectedSongId(song.id);
                                setPlayerOpen(true);
                            }, children: [_jsx("img", { alt: song.title, className: "cover-image", src: song.coverUrl ?? undefined }), _jsx("button", { className: "song-delete", disabled: removingSongIds.includes(song.id), onClick: (event) => {
                                        event.stopPropagation();
                                        void deleteSong(song.id);
                                    }, type: "button", "aria-label": removingSongIds.includes(song.id) ? "删除中" : `删除 ${song.title}`, children: removingSongIds.includes(song.id) ? "删除中" : "删除" }), _jsx("div", { className: "song-card-overlay", children: _jsxs("div", { className: "song-card-title", children: [_jsx("strong", { children: song.title }), _jsx(Tag, { tone: song.status === "ready" ? "success" : "default", children: songStatusLabel(song.status) })] }) })] }, song.id))) }))] }), selectedSong && playerOpen ? (_jsx(PlayerOverlay, { song: selectedSong, onClose: () => setPlayerOpen(false) })) : null] }));
}
