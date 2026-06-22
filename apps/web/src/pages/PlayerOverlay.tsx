import { useEffect, useRef, useState } from "react";
import type { Song } from "@ai-music/types";
import { Tag, cx } from "@ai-music/ui";
import { songStatusLabel } from "../data/options";

export function PlayerOverlay(props: { song: Song; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        props.onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.onClose]);

  function formatTime(value: number) {
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

  function handleSeek(nextValue: number) {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = nextValue;
    setCurrentTime(nextValue);
  }

  return (
    <div className="player-overlay" role="dialog" aria-modal="true">
      <div className="desktop-player">
        <div className="desktop-player-topbar">
          <button className="player-close" onClick={props.onClose} type="button">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              返回音乐库
            </span>
          </button>
          <div className="desktop-player-window" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="desktop-player-body">
          <div className="desktop-player-left">
            <div className="desktop-player-turntable">
              <div className={cx("desktop-player-disc", isPlaying && "spinning")}>
                <img alt={props.song.title} className="desktop-player-cover" src={props.song.coverUrl ?? undefined} />
              </div>
            </div>
          </div>
          <div className="desktop-player-right">
            <div className="player-copy">
              <div className="player-title-row">
                <h3>{props.song.title}</h3>
                <Tag tone={props.song.status === "ready" ? "success" : "default"}>
                  {songStatusLabel(props.song.status)}
                </Tag>
              </div>
              <p className="player-artist">AI Music Library</p>
            </div>
            <div className="lyrics-panel">
              <strong>歌词</strong>
              <div className="lyrics-scroll">
                <p>{props.song.lyricsSnippet || "当前还没有歌词返回。"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="desktop-player-bottom">
          <div className="player-meta-row">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            className="player-slider"
            disabled={!props.song.audioUrl}
            max={duration || 0}
            min={0}
            onChange={(event) => handleSeek(Number(event.target.value))}
            type="range"
            value={Math.min(currentTime, duration || 0)}
            aria-label="播放进度"
          />
          <div className="player-controls desktop-player-controls">
            <button className="ghost-button player-secondary" type="button" aria-label="循环">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                循环
              </span>
            </button>
            <button
              className="player-main-button"
              disabled={!props.song.audioUrl}
              onClick={() => void togglePlayback()}
              type="button"
              aria-label={isPlaying ? "暂停" : "播放"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style={{ position: "relative" }}>
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style={{ position: "relative", marginLeft: "3px" }}>
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
              )}
            </button>
            <button className="ghost-button player-secondary" type="button" aria-label="列表">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                列表
              </span>
            </button>
          </div>
          <div className="player-stats">
            <span>{props.song.audioUrl ? "音频可播放" : "等待音频返回"}</span>
            <span>{props.song.durationSeconds ? `${props.song.durationSeconds}s` : "未返回时长"}</span>
          </div>
        </div>
        <audio key={props.song.id} ref={audioRef} src={props.song.audioUrl ?? undefined} />
      </div>
    </div>
  );
}
