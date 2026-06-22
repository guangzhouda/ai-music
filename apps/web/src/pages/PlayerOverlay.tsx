import { useEffect, useRef, useState } from "react";
import type { Song } from "@ai-music/types";
import { Tag } from "@ai-music/ui";
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
            返回音乐库
          </button>
          <div className="desktop-player-window">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="desktop-player-body">
          <div className="desktop-player-left">
            <div className="desktop-player-turntable">
              <div className="desktop-player-disc">
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
          />
          <div className="player-controls desktop-player-controls">
            <button className="ghost-button player-secondary" type="button">
              循环
            </button>
            <button
              className="player-main-button"
              disabled={!props.song.audioUrl}
              onClick={() => void togglePlayback()}
              type="button"
            >
              {isPlaying ? "暂停" : "播放"}
            </button>
            <button className="ghost-button player-secondary" type="button">
              列表
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

