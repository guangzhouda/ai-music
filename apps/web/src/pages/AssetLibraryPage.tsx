import { useEffect, useState } from "react";
import { Panel, Tag } from "@ai-music/ui";
import type { PromptAssetLibrary } from "@ai-music/types";
import { SectionTitle } from "../components/SectionTitle";
import { fetchJson } from "../hooks/useApi";
import { toReadableErrorMessage } from "../data/utils";

const emptyPromptAssets: PromptAssetLibrary = { updatedAt: null, assets: [] };


export function AssetLibraryPage() {
  const [library, setLibrary] = useState<PromptAssetLibrary>(emptyPromptAssets);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      try {
        const result = await fetchJson<PromptAssetLibrary>("/api/prompt-assets");
        if (!cancelled) {
          setLibrary(result);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(toReadableErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  function patchAsset(key: PromptAssetLibrary["assets"][number]["key"], systemPrompt: string) {
    setLibrary((current) => ({
      ...current,
      assets: current.assets.map((asset) => (asset.key === key ? { ...asset, systemPrompt } : asset))
    }));
  }

  async function saveAssets() {
    setSaving(true);
    setMessage("");

    try {
      const result = await fetchJson<PromptAssetLibrary>("/api/prompt-assets", {
        method: "PUT",
        body: JSON.stringify(library)
      });
      setLibrary(result);
      setMessage("资产库已保存。后续 DeepSeek 摘要、角色提取和小说成歌都会使用这里的系统提示词。");
    } catch (error) {
      setMessage(toReadableErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="single-column asset-page">
      <Panel>
        <SectionTitle
          eyebrow="Assets"
          title="提示词资产库"
          description="这里维护所有会发给 DeepSeek 的系统提示词。它们不会直接发给 Suno，但会影响摘要、角色提取、小说成歌提示词草稿和最终歌词内容。建议明确要求规避真实艺人名、品牌名和其他敏感词。"
        />
        <div className="settings-toolbar">
          <div className="runtime-mode-card">
            <span className="toggle-label">当前用途</span>
            <span className="field-hint">
              导入全文时的摘要、长文分段分析、全文汇总、小说成歌草稿生成，都会使用下面这些大模型系统提示词。
            </span>
          </div>
          <button className="primary-button" disabled={loading || saving} onClick={() => void saveAssets()} type="button">
            {saving ? "保存中..." : "保存资产"}
          </button>
        </div>
        {message ? <div className="inline-message">{message}</div> : null}
      </Panel>

      <div className="asset-grid">
        {library.assets.map((asset) => (
          <Panel key={asset.key}>
            <div className="asset-card-header">
              <div>
                <Tag tone="accent">{asset.targetModel}</Tag>
                <h3>{asset.title}</h3>
              </div>
              <span className="asset-key">{asset.key}</span>
            </div>
            <p className="asset-description">{asset.description}</p>
            <label className="asset-label">
              系统提示词
              <textarea
                rows={10}
                value={asset.systemPrompt}
                onChange={(event) => patchAsset(asset.key, event.target.value)}
              />
            </label>
            <p className="field-hint">
              说明：这部分是发给 DeepSeek 的 system prompt。实际业务数据，例如全文摘要、角色、节选内容，会作为 user prompt 在运行时拼接。这里可以直接加上“避免真实艺人名、规避敏感词、改写成虚构表达”等规则。
            </p>
          </Panel>
        ))}
      </div>
    </div>
  );
}

