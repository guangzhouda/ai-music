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
          <p>把创意直接推进成可执行歌曲任务。</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/quick">一键成歌</Link>
            <Link className="ghost-button" to="/novel">小说成歌</Link>
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
          <SectionTitle eyebrow="Recent" title="最近歌曲" description={props.loading ? "正在加载…" : ""} />
          <div className="stack-list compact-scroll">
            {latestSongs.length === 0 ? (
              <EmptyState text="还没有歌曲，先去一键成歌或导入小说。" />
            ) : (
              latestSongs.map((song) => (
                <article className="list-card" key={song.id}>
                  <div><strong>{song.title}</strong><p>{song.prompt.slice(0, 88)}</p></div>
                  <Tag tone={song.status === "ready" ? "success" : "default"}>{song.status}</Tag>
                </article>
              ))
            )}
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Tasks" title="最近任务" description="" />
          <div className="stack-list compact-scroll">
            {latestTasks.length === 0 ? (
              <EmptyState text="暂无任务。" />
            ) : (
              latestTasks.map((task) => (
                <article className="list-card" key={task.id}>
                  <div><strong>{task.title}</strong><p>{task.progressLabel}</p></div>
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
