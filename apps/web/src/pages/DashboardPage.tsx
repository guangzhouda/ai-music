import { Link } from "react-router-dom";
import { Tag, Panel } from "@ai-music/ui";
import type { AccountInfo, Song, SongTask } from "@ai-music/types";
import { Metric } from "../components/Metric";
import { SectionTitle } from "../components/SectionTitle";
import { EmptyState } from "../components/EmptyState";

interface Props {
  account: AccountInfo;
  songs: Song[];
  tasks: SongTask[];
  loading: boolean;
}

export function DashboardPage(props: Props) {
  const latestSongs = props.songs.slice(0, 3);
  const latestTasks = props.tasks.slice(0, 4);

  return (
    <div className="single-column dashboard-page">
      <section className="hero">
        <div className="hero-copy">
          <Tag tone="accent">Suno + 小说成歌</Tag>
          <h1>AI 音乐工作台</h1>
          <p>把创意直接推进成可执行歌曲任务。从一句话到一首歌，从一段小说到一个 OST，全流程可视化。</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/quick">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                一键成歌
              </span>
            </Link>
            <Link className="ghost-button" to="/novel">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                小说成歌
              </span>
            </Link>
          </div>
        </div>
        <Panel className="hero-panel">
          <div className="stat-row">
            <Metric title="模式" value={props.account.mode === "mock" ? "Mock" : "Live"} />
            <Metric title="余额" value={String(props.account.creditsRemaining)} />
            <Metric title="歌曲" value={String(props.songs.length)} />
            <Metric title="任务" value={String(props.tasks.length)} />
          </div>
        </Panel>
      </section>

      <div className="two-column dashboard-lower">
        <Panel>
          <SectionTitle eyebrow="Recent" title="最近歌曲" description={props.loading ? "正在加载…" : "最新生成的歌曲会出现在这里。"} />
          <div className="stack-list compact-scroll">
            {latestSongs.length === 0 ? (
              <EmptyState text="还没有歌曲，先去一键成歌或导入小说。" />
            ) : (
              latestSongs.map((song) => (
                <article className="list-card" key={song.id}>
                  <div>
                    <strong>{song.title}</strong>
                    <p>{song.prompt.slice(0, 88)}</p>
                  </div>
                  <Tag tone={song.status === "ready" ? "success" : "default"}>{song.status}</Tag>
                </article>
              ))
            )}
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Tasks" title="最近任务" description="跟踪 Suno 任务状态。" />
          <div className="stack-list compact-scroll">
            {latestTasks.length === 0 ? (
              <EmptyState text="暂无任务。" />
            ) : (
              latestTasks.map((task) => (
                <article className="list-card" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.progressLabel}</p>
                  </div>
                  <Tag tone={task.status === "succeeded" ? "success" : "default"}>{task.status}</Tag>
                </article>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
