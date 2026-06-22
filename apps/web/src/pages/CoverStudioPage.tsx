import { useEffect, useState } from "react";
import { Panel, Tag } from "@ai-music/ui";
import type { Song } from "@ai-music/types";
import { SectionTitle } from "../components/SectionTitle";
import { EmptyState } from "../components/EmptyState";
import { fetchJson } from "../hooks/useApi";

export function CoverStudioPage(props: { songs: Song[]; onSuccess: () => Promise<void> }) {
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

  return (
    <div className="two-column cover-page">
      <Panel>
        <SectionTitle
          eyebrow="Cover"
          title="封面生成"
          description="封面单独维护，不再和音乐库混在同一页。"
        />
        {selectedSong ? (
          <div className="selected-song">
            <img alt={selectedSong.title} className="selected-song-cover" src={selectedSong.coverUrl ?? undefined} />
            <div>
              <strong>{selectedSong.title}</strong>
              <p>{selectedSong.lyricsSnippet || "当前还没有歌词返回。可先生成歌曲后再补图。"}</p>
            </div>
          </div>
        ) : null}
        <div className="form-grid">
          <label>
            选择歌曲
            <select
              disabled={!props.songs.length}
              value={selectedSongId}
              onChange={(event) => setSelectedSongId(event.target.value)}
            >
              {!props.songs.length ? <option value="">请先生成歌曲</option> : null}
              {props.songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                </option>
              ))}
            </select>
          </label>
          <label className="full-span">
            封面描述
            <textarea
              rows={5}
              value={coverPrompt}
              onChange={(event) => setCoverPrompt(event.target.value)}
            />
          </label>
        </div>
        <button
          className="primary-button"
          disabled={!selectedSongId}
          onClick={() => void generateCover()}
          type="button"
        >
          生成封面
        </button>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Preview"
          title="封面预览"
          description="这里展示当前选中的歌曲封面和已返回的歌词片段。"
        />
        {selectedSong ? (
          <div className="cover-preview-panel">
            <img alt={selectedSong.title} className="cover-preview-image" src={selectedSong.coverUrl ?? undefined} />
            <div className="stack-list">
              <article className="list-card">
                <div>
                  <strong>{selectedSong.title}</strong>
                  <p>{selectedSong.mode}</p>
                </div>
                <Tag tone={selectedSong.status === "ready" ? "success" : "default"}>{selectedSong.status}</Tag>
              </article>
              <article className="lyric-card">
                <strong>歌词片段</strong>
                <p>{selectedSong.lyricsSnippet || "当前还没有歌词返回。"}</p>
              </article>
            </div>
          </div>
        ) : (
          <EmptyState text="请先在左侧选择歌曲。" />
        )}
      </Panel>
    </div>
  );
}

