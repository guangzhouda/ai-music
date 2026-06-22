import { Panel, Tag } from "@ai-music/ui";
import { SectionTitle } from "../components/SectionTitle";
import { docsCatalog } from "../data/docs";

export function DocsPage() {
  return (
    <div className="two-column docs-page">
      <Panel>
        <SectionTitle
          eyebrow="Docs"
          title="项目文档"
          description="集中查看外部 API 摘要、风格规则和系统设计，不再与首页内容混在一起。"
        />
        <div className="docs-grid">
          {docsCatalog.map((docItem) => (
            <article className="doc-card" key={docItem.id}>
              <Tag>{docItem.category}</Tag>
              <strong>{docItem.title}</strong>
              <p>{docItem.description}</p>
              {docItem.href === "#" ? (
                <span className="doc-hint">对应正式内容已保存在仓库 `doc/` 目录。</span>
              ) : (
                <a className="doc-link" href={docItem.href} rel="noreferrer" target="_blank">
                  打开参考链接
                </a>
              )}
            </article>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Repo Docs"
          title="仓库内文档文件"
          description="以下文件是项目中的正式文档落点。"
        />
        <div className="stack-list compact-scroll">
          {[
            "doc/suno-api-summary.md",
            "doc/volcengine-cover-api.md",
            "doc/music-style-rules.md",
            "doc/novel-to-song-design.md",
            "doc/system-architecture.md",
            "README.md"
          ].map((file) => (
            <article className="list-card" key={file}>
              <div>
                <strong>{file}</strong>
                <p>仓库内的正式文档文件。</p>
              </div>
              <Tag>Local</Tag>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

