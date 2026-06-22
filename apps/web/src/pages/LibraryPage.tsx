import { useEffect, useRef, useState } from "react";
import { Panel, Tag, cx } from "@ai-music/ui";
import type { Song } from "@ai-music/types";
import { SectionTitle } from "../components/SectionTitle";
import { EmptyState } from "../components/EmptyState";
import { fetchJson } from "../hooks/useApi";
import { toReadableErrorMessage } from "../data/utils";
import { songStatusTextMap, songStatusLabel } from "../data/options";
import { PlayerOverlay } from "./PlayerOverlay";

export function LibraryPage(props: { songs: Song[]; onSuccess: () => Promise<void> }) {
  const [selectedSongId, setSelectedSongId] = useState("");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [removingSongIds, setRemovingSongIds] = useState<string[]>([]);
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

  async function deleteSong(songId: string) {
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
    } catch (error) {
      setRemovingSongIds((current) => current.filter((id) => id !== songId));
      setDeleteMessage(toReadableErrorMessage(error));
    }
  }

  return (
    <div className="single-column library-page desktop-library-page">
      <section className="library-stage">
        <div className="library-stage-header">
          <SectionTitle
            eyebrow="Library"
            title="音乐库"
            description="按歌名与封面查看歌曲。Suno 成功任务会按返回结果拆成两首歌分别入库；删除单首歌曲时，会尽量保留同任务下的另一首。"
          />
        </div>
        {deleteMessage ? <div className="inline-message">{deleteMessage}</div> : null}
        {visibleSongs.length === 0 ? (
          <EmptyState text="当前没有歌曲记录。" />
        ) : (
          <div className="library-grid library-grid-page">
            {visibleSongs.map((song) => (
              <article
                className={cx("song-card", selectedSongId === song.id && "song-card-active")}
                key={song.id}
                onClick={() => {
                  setSelectedSongId(song.id);
                  setPlayerOpen(true);
                }}
              >
                <img alt={song.title} className="cover-image" src={song.coverUrl ?? undefined} />
                <button
                  className="song-delete"
                  disabled={removingSongIds.includes(song.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteSong(song.id);
                  }}
                  type="button"
                >
                  {removingSongIds.includes(song.id) ? "删除中" : "删除"}
                </button>
                <div className="song-card-overlay">
                  <div className="song-card-title">
                    <strong>{song.title}</strong>
                    <Tag tone={song.status === "ready" ? "success" : "default"}>
                      {songStatusLabel(song.status)}
                    </Tag>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedSong && playerOpen ? (
        <PlayerOverlay song={selectedSong} onClose={() => setPlayerOpen(false)} />
      ) : null}
    </div>
  );
}

