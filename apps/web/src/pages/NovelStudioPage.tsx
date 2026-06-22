import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Panel, cx } from "@ai-music/ui";
import type { GenreRule, NovelDocument, NovelPromptDraft, SunoModel, VocalGender } from "@ai-music/types";
import { SectionTitle } from "../components/SectionTitle";
import { fetchJson } from "../hooks/useApi";
import { buildStyleText, toReadableErrorMessage } from "../data/utils";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
import { novelModeOptions, sunoModelOptions, vocalGenderOptions, getNovelModeLabel } from "../data/options";

interface Props { documents: NovelDocument[]; rules: GenreRule[]; onSuccess: () => Promise<void>; }

const STEPS = [
  { key: "import", label: "选择小说", hint: "导入或选择一个已有文档" },
  { key: "config", label: "配置参数", hint: "设置模式、风格与聚焦内容" },
  { key: "generate", label: "生成提交", hint: "预览提示词并提交到 Suno" }
] as const;

export function NovelStudioPage(props: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [title, setTitle] = useState("未命名小说");
  const [text, setText] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [mode, setMode] = useState("novel-full");
  const [focus, setFocus] = useState("围绕主角命运和故事宿命感");
  const [styleRuleSlug, setStyleRuleSlug] = useState(props.rules[0]?.slug ?? "mandopop-cinematic");
  const [customStyleNotes, setCustomStyleNotes] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [makeInstrumental, setMakeInstrumental] = useState(false);
  const [model, setModel] = useState<SunoModel>("V4_5ALL");
  const [negativeTags, setNegativeTags] = useState("");
  const [vocalGender, setVocalGender] = useState<VocalGender>("");
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftStylePrompt, setDraftStylePrompt] = useState("");
  const [draftSignature, setDraftSignature] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeDocument = props.documents.find((document) => document.id === documentId) ?? null;
  const currentStylePrompt = buildStyleText(props.rules, styleRuleSlug, customStyleNotes);
  const currentDraftSignature = JSON.stringify({
    documentId, mode, focus, stylePrompt: currentStylePrompt, makeInstrumental, model, negativeTags, vocalGender, excerpt
  });
  const draftStale = Boolean(draftSignature) && draftSignature !== currentDraftSignature;

  function fallbackNovelTitle() {
    if (!activeDocument) return "";
    return `${activeDocument.title} · ${getNovelModeLabel(mode)}${makeInstrumental ? " · 纯音乐" : ""}`;
  }

  useEffect(() => {
    if (!props.documents.length) {
      if (documentId) setDocumentId("");
      return;
    }
    const stillExists = props.documents.some((document) => document.id === documentId);
    if (!stillExists) setDocumentId(props.documents[0].id);
  }, [documentId, props.documents]);

  useEffect(() => {
    if (!props.rules.find((rule) => rule.slug === styleRuleSlug) && props.rules[0]) {
      setStyleRuleSlug(props.rules[0].slug);
    }
  }, [props.rules, styleRuleSlug]);

  async function importDocument() {
    setImporting(true);
    setImportMessage("");
    try {
      const document = await fetchJson<NovelDocument>("/api/novels/import", {
        method: "POST",
        body: JSON.stringify({ title, text })
      });
      setDocumentId(document.id);
      setText("");
      setDraftSignature("");
      setDraftTitle("");
      setDraftPrompt("");
      setDraftStylePrompt("");
      await props.onSuccess();
      setImportMessage(`已导入文本：${document.title}`);
      setShowImportPanel(false);
    } catch (error) {
      setImportMessage(toReadableErrorMessage(error));
    } finally {
      setImporting(false);
    }
  }

  async function importFile() {
    if (!selectedFile) return;
    setUploading(true);
    setImportMessage("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch(`${apiBaseUrl}/api/novels/import-file`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(toReadableErrorMessage(payload?.error ?? `${response.status} ${response.statusText}`));
      }
      const document = (await response.json()) as NovelDocument;
      setDocumentId(document.id);
      setSelectedFile(null);
      setFileInputKey((current) => current + 1);
      setDraftSignature("");
      setDraftTitle("");
      setDraftPrompt("");
      setDraftStylePrompt("");
      await props.onSuccess();
      setImportMessage(`已导入文件：${document.title}`);
      setShowImportPanel(false);
    } catch (error) {
      setImportMessage(toReadableErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function generateDraft() {
    if (!documentId) return;
    setDraftLoading(true);
    setDraftMessage("");
    try {
      const draft = await fetchJson<NovelPromptDraft>("/api/generate/novel/preview", {
        method: "POST",
        body: JSON.stringify({
          documentId, mode, focus, stylePrompt: currentStylePrompt, makeInstrumental, model, negativeTags, vocalGender, excerpt
        })
      });
      setDraftTitle(draft.title.trim().length >= 2 ? draft.title : fallbackNovelTitle());
      setDraftPrompt(draft.prompt);
      setDraftStylePrompt(draft.stylePrompt);
      setDraftSignature(currentDraftSignature);
      setDraftMessage("提示词草稿已生成，可在下方修改后提交。");
    } catch (error) {
      setDraftMessage(toReadableErrorMessage(error));
    } finally {
      setDraftLoading(false);
    }
  }

  async function generateNovelSong() {
    if (!documentId || !draftPrompt.trim()) return;
    setSubmitting(true);
    setDraftMessage("");
    try {
      await fetchJson("/api/generate/novel", {
        method: "POST",
        body: JSON.stringify({
          documentId, mode, focus, stylePrompt: draftStylePrompt.trim() || currentStylePrompt,
          makeInstrumental, model, negativeTags, vocalGender, excerpt, title: draftTitle.trim(), prompt: draftPrompt.trim()
        })
      });
      await props.onSuccess();
      setDraftMessage("歌曲任务已提交到 Suno。");
    } catch (error) {
      setDraftMessage(toReadableErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const canGoNext = step === 0 ? Boolean(documentId) : step === 1 ? Boolean(documentId) : true;

  return (
    <div className="single-column novel-page">
      <SectionTitle eyebrow="Novel Studio" title="小说成歌" description="把小说文本转化为 Suno 歌曲任务，三步完成：选择文档 → 配置参数 → 生成提交。" />

      {/* 步骤指示器 */}
      <div className="novel-steps" role="tablist" aria-label="小说成歌步骤">
        {STEPS.map((item, index) => (
          <button
            key={item.key}
            className={cx("novel-step", step === index && "novel-step-active", index < step && "novel-step-done")}
            onClick={() => setStep(index as 0 | 1 | 2)}
            type="button"
            role="tab"
            aria-selected={step === index}
          >
            <span className="novel-step-index">{index < step ? "✓" : index + 1}</span>
            <span className="novel-step-text">
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </span>
          </button>
        ))}
      </div>

      <Panel>
        {/* 步骤 1：选择/导入小说 */}
        {step === 0 ? (
          <div className="novel-step-panel">
            <div className="novel-step-head">
              <h3>选择一个已有文档</h3>
              <button className="ghost-button" onClick={() => setShowImportPanel((v) => !v)} type="button">
                {showImportPanel ? "收起导入" : "导入新文档"}
              </button>
            </div>

            {showImportPanel ? (
              <div className="novel-import-card">
                <div className="form-grid">
                  <label>
                    文本标题
                    <input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>
                  <label className="full-span">
                    正文
                    <textarea placeholder="粘贴整篇小说、章节或长文内容。" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
                  </label>
                </div>
                <div className="form-actions">
                  <button className="primary-button" onClick={() => void importDocument()} type="button" disabled={importing}>
                    {importing ? "导入中..." : "导入正文"}
                  </button>
                  <label className="file-picker">
                    <input key={fileInputKey} accept=".txt,.md,.docx,.pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} type="file" />
                    <span>{selectedFile ? selectedFile.name : "选择 txt / md / docx / pdf"}</span>
                  </label>
                  <button className="ghost-button" disabled={!selectedFile || uploading} onClick={() => void importFile()} type="button">
                    {uploading ? "上传中..." : "上传并导入"}
                  </button>
                </div>
              </div>
            ) : null}

            {importMessage ? <div className="inline-message">{importMessage}</div> : null}

            <div className="novel-doc-list">
              {props.documents.length === 0 ? (
                <div className="empty-state">还没有文档，点击右上角"导入新文档"开始。</div>
              ) : (
                props.documents.map((doc) => (
                  <button
                    key={doc.id}
                    className={cx("doc-pick", documentId === doc.id && "doc-pick-active")}
                    onClick={() => setDocumentId(doc.id)}
                    type="button"
                  >
                    <span>{doc.title}</span>
                    <small>{doc.chunks.length} 片段 · {doc.characters.slice(0, 3).join("、") || "待分析"}</small>
                  </button>
                ))
              )}
            </div>

            {activeDocument ? (
              <div className="selected-doc-summary">
                <strong>{activeDocument.title}</strong>
                <p>{activeDocument.summary}</p>
              </div>
            ) : null}

            <div className="novel-step-actions">
              <span className="novel-step-hint">{documentId ? "已选择文档，可进入下一步。" : "请先选择或导入一个文档。"}</span>
              <button className="primary-button" disabled={!canGoNext} onClick={() => setStep(1)} type="button">
                下一步：配置参数
              </button>
            </div>
          </div>
        ) : null}

        {/* 步骤 2：配置参数 */}
        {step === 1 ? (
          <div className="novel-step-panel">
            <div className="novel-step-head">
              <h3>配置生成参数</h3>
              <button className="ghost-button" onClick={() => setShowAdvanced((v) => !v)} type="button">
                {showAdvanced ? "收起高级选项" : "高级选项"}
              </button>
            </div>

            {/* 模式选择 */}
            <div className="toggle-block">
              <span className="toggle-label">创作模式</span>
              <div className="novel-mode-grid">
                {novelModeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={cx("mode-card", mode === opt.value && "mode-card-active")}
                    onClick={() => setMode(opt.value)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 生成类型 */}
            <div className="toggle-block">
              <span className="toggle-label">生成类型</span>
              <div className="switch-row">
                <button className={cx("toggle-chip", !makeInstrumental && "toggle-chip-active")} onClick={() => setMakeInstrumental(false)} type="button">
                  生成人声歌曲
                </button>
                <button className={cx("toggle-chip", makeInstrumental && "toggle-chip-active")} onClick={() => setMakeInstrumental(true)} type="button">
                  生成纯音乐
                </button>
              </div>
            </div>

            {/* 核心字段 */}
            <div className="form-grid">
              <label>
                风格
                <select value={styleRuleSlug} onChange={(event) => setStyleRuleSlug(event.target.value)}>
                  {props.rules.map((rule) => (<option key={rule.slug} value={rule.slug}>{rule.name}</option>))}
                </select>
              </label>
              <label>
                模型
                <select value={model} onChange={(event) => setModel(event.target.value as SunoModel)}>
                  {sunoModelOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                </select>
              </label>
              <label className="full-span">
                聚焦内容
                <textarea value={focus} rows={2} onChange={(event) => setFocus(event.target.value)} />
              </label>
            </div>

            {/* 高级选项 */}
            {showAdvanced ? (
              <div className="novel-advanced">
                <div className="form-grid">
                  <label>
                    人声性别
                    <select value={vocalGender} onChange={(event) => setVocalGender(event.target.value as VocalGender)}>
                      {vocalGenderOptions.map((option) => (<option key={option.value || "auto"} value={option.value}>{option.label}</option>))}
                    </select>
                  </label>
                  <label>
                    反向标签
                    <input value={negativeTags} onChange={(event) => setNegativeTags(event.target.value)} placeholder="例如：metal scream, noisy intro" />
                  </label>
                  <label className="full-span">
                    风格补充
                    <textarea value={customStyleNotes} rows={2} onChange={(event) => setCustomStyleNotes(event.target.value)} placeholder="例如：更强调宿命感、女声主唱、副歌更炸裂。" />
                  </label>
                  <label className="full-span">
                    节选内容或角色说明
                    <textarea value={excerpt} rows={2} onChange={(event) => setExcerpt(event.target.value)} placeholder="可粘贴段落、对白、角色介绍等。" />
                  </label>
                </div>
              </div>
            ) : null}

            <div className="novel-step-actions">
              <button className="ghost-button" onClick={() => setStep(0)} type="button">上一步</button>
              <button className="primary-button" disabled={!canGoNext} onClick={() => setStep(2)} type="button">
                下一步：生成提交
              </button>
            </div>
          </div>
        ) : null}

        {/* 步骤 3：生成与提交 */}
        {step === 2 ? (
          <div className="novel-step-panel">
            <div className="novel-step-head">
              <h3>生成提示词并提交</h3>
              <Link className="inline-link" to="/assets">维护 DeepSeek 系统提示词</Link>
            </div>

            <div className="novel-draft-actions">
              <button className="primary-button" disabled={draftLoading || !documentId} onClick={() => void generateDraft()} type="button">
                {draftLoading ? "生成草稿中..." : draftPrompt ? "重新生成草稿" : "生成提示词草稿"}
              </button>
              <button
                className="primary-button"
                disabled={!draftPrompt.trim() || draftStale || submitting}
                onClick={() => void generateNovelSong()}
                type="button"
                style={{ background: "var(--gradient-warm)" }}
              >
                {submitting ? "提交中..." : "提交到 Suno"}
              </button>
            </div>

            {draftStale ? <div className="inline-message">参数已变更，请重新生成草稿再提交。</div> : null}
            {draftMessage ? <div className="inline-message">{draftMessage}</div> : null}

            {draftPrompt ? (
              <div className="form-grid prompt-review-grid no-margin">
                <label className="full-span">
                  最终歌名
                  <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
                </label>
                <label className="full-span">
                  歌词/内容提示词
                  <textarea value={draftPrompt} rows={8} onChange={(e) => setDraftPrompt(e.target.value)} />
                </label>
                <label className="full-span">
                  风格提示词
                  <textarea value={draftStylePrompt} rows={3} onChange={(e) => setDraftStylePrompt(e.target.value)} />
                </label>
              </div>
            ) : (
              <div className="empty-state">点击上方"生成提示词草稿"，AI 会基于全文生成歌词与风格提示词。</div>
            )}

            <div className="novel-step-actions">
              <button className="ghost-button" onClick={() => setStep(1)} type="button">上一步：修改参数</button>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
