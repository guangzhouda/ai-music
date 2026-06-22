import { useEffect, useState } from "react";
import { Panel } from "@ai-music/ui";
import type { GenreRule, SunoModel, VocalGender } from "@ai-music/types";
import { SectionTitle } from "../components/SectionTitle";
import { fetchJson } from "../hooks/useApi";
import { buildStyleText } from "../data/utils";
import { sunoModelOptions, vocalGenderOptions } from "../data/options";

interface Props { onSuccess: () => Promise<void>; rules: GenreRule[]; }


export function QuickCreatePage(props: { onSuccess: () => Promise<void>; rules: GenreRule[] }) {
  const [title, setTitle] = useState("夜航城市");
  const [prompt, setPrompt] = useState("写一首关于凌晨城市、霓虹和独自赶路的华语流行歌曲");
  const [styleRuleSlug, setStyleRuleSlug] = useState(props.rules[0]?.slug ?? "mandopop-cinematic");
  const [customStyleNotes, setCustomStyleNotes] = useState("");
  const [makeInstrumental, setMakeInstrumental] = useState(false);
  const [model, setModel] = useState<SunoModel>("V4_5ALL");
  const [negativeTags, setNegativeTags] = useState("");
  const [vocalGender, setVocalGender] = useState<VocalGender>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!props.rules.find((rule) => rule.slug === styleRuleSlug) && props.rules[0]) {
      setStyleRuleSlug(props.rules[0].slug);
    }
  }, [props.rules, styleRuleSlug]);

  async function submit() {
    setSubmitting(true);
    try {
      await fetchJson("/api/generate/quick", {
        method: "POST",
        body: JSON.stringify({
          title,
          prompt,
          stylePrompt: buildStyleText(props.rules, styleRuleSlug, customStyleNotes),
          makeInstrumental,
          model,
          negativeTags,
          vocalGender
        })
      });
      await props.onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="single-column quick-page">
      <Panel>
        <SectionTitle
          eyebrow="Quick Create"
          title="一键成歌"
          description="输入一句需求，系统会组织标题、风格和提示词后提交到 Suno。"
        />
        <div className="quick-layout">
          <div className="form-grid no-margin">
            <label>
              标题
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              风格规则
              <select value={styleRuleSlug} onChange={(event) => setStyleRuleSlug(event.target.value)}>
                {props.rules.map((rule) => (
                  <option key={rule.slug} value={rule.slug}>
                    {rule.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              模型
              <select value={model} onChange={(event) => setModel(event.target.value as SunoModel)}>
                {sunoModelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-span">
              提交给 Suno 的歌词/内容提示词
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} />
              <span className="field-hint">
                这里的内容会直接提交给 Suno。人声歌曲场景下，它通常会同时影响歌词、叙事和旋律走向。
              </span>
            </label>
            <label className="full-span">
              风格补充
              <textarea
                value={customStyleNotes}
                onChange={(event) => setCustomStyleNotes(event.target.value)}
                rows={3}
                placeholder="例如：副歌更大开大合，主歌更克制，偏电影配乐。"
              />
            </label>
            <label>
              人声性别
              <select value={vocalGender} onChange={(event) => setVocalGender(event.target.value as VocalGender)}>
                {vocalGenderOptions.map((option) => (
                  <option key={option.value || "auto"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              反向标签
              <input
                value={negativeTags}
                onChange={(event) => setNegativeTags(event.target.value)}
                placeholder="例如：screamo, heavy distortion"
              />
            </label>
            <label className="checkbox-row full-span">
              <input
                checked={makeInstrumental}
                onChange={(event) => setMakeInstrumental(event.target.checked)}
                type="checkbox"
              />
              仅生成纯音乐
            </label>
          </div>
          <div className="quick-side">
            <div className="stack-list">
              <article className="list-card">
                <div>
                  <strong>标题</strong>
                  <p>{title || "未填写标题"}</p>
                </div>
              </article>
              <article className="list-card">
                <div>
                  <strong>模式</strong>
                  <p>{makeInstrumental ? "纯音乐" : "人声歌曲"}</p>
                </div>
              </article>
              <article className="list-card">
                <div>
                  <strong>风格</strong>
                  <p>{buildStyleText(props.rules, styleRuleSlug, customStyleNotes)}</p>
                </div>
              </article>
              <article className="list-card">
                <div>
                  <strong>模型 / 人声</strong>
                  <p>
                    {model}
                    {makeInstrumental ? " / 纯音乐" : ` / ${vocalGenderOptions.find((option) => option.value === vocalGender)?.label ?? "自动"}`}
                  </p>
                </div>
              </article>
            </div>
            <button className="primary-button quick-submit" onClick={() => void submit()} type="button">
              {submitting ? "提交中..." : "提交 Suno 任务"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

