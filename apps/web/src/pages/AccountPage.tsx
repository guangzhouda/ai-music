import { Panel, Tag } from "@ai-music/ui";
import type { AccountInfo, GenreRule } from "@ai-music/types";
import { SectionTitle } from "../components/SectionTitle";
import { Metric } from "../components/Metric";
import { EmptyState } from "../components/EmptyState";
import { sunoModelOptions } from "../data/options";

interface Props { account: AccountInfo; onRefreshAccount: () => Promise<void>; rules: GenreRule[]; syncingAccount: boolean; }


export function AccountPage(props: {
  account: AccountInfo;
  rules: GenreRule[];
  syncingAccount: boolean;
  onRefreshAccount: () => Promise<void>;
}) {
  return (
    <div className="two-column account-page">
      <Panel>
        <SectionTitle
          eyebrow="Provider"
          title="账户与余额"
          description="这里聚合 Suno credits、运行模式和回调状态。"
        />
        <div className="panel-toolbar">
          <button className="ghost-button" onClick={() => void props.onRefreshAccount()} type="button">
            {props.syncingAccount ? "同步中..." : "同步余额"}
          </button>
        </div>
        {props.account.mode === "mock" ? (
          <div className="inline-message">
            当前处于 `mock` 模式，页面中的 credits 是模拟值，不会和 Suno 后台余额一致。
          </div>
        ) : null}
        <div className="stat-row">
          <Metric title="Provider" value={props.account.provider} />
          <Metric title="Mode" value={props.account.mode} />
          <Metric title="Credits" value={String(props.account.creditsRemaining)} />
          <Metric title="Callback" value={props.account.callbackConfigured ? "自定义公网" : "本地占位"} />
        </div>
        <p className="footnote">最近查询时间：{props.account.lastCheckedAt ?? "尚未同步"}</p>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Rules"
          title="风格规则库"
          description="这些规则会进入文档、表单和小说成歌提示词。"
        />
        <div className="stack-list compact-scroll">
          {props.rules.map((rule) => (
            <article className="list-card" key={rule.slug}>
              <div>
                <strong>{rule.name}</strong>
                <p>{rule.arrangementNotes.join("；")}</p>
              </div>
              <Tag>{rule.bpmRange}</Tag>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

