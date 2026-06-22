import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Panel, cx } from "@ai-music/ui";
import type { GenreRule, NovelDocument, NovelPromptDraft, SunoModel, VocalGender } from "@ai-music/types";
import { SectionTitle } from "../components/SectionTitle";
import { fetchJson } from "../hooks/useApi";
import { buildStyleText, toReadableErrorMessage } from "../data/utils";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
import { NovelImportSection } from "../components/NovelImportSection";
import { NovelModeSelector } from "../components/NovelModeSelector";
import { NovelDraftReview } from "../components/NovelDraftReview";
import { sunoModelOptions, vocalGenderOptions, getNovelModeLabel } from "../data/options";

interface Props { documents: NovelDocument[]; rules: GenreRule[]; onSuccess: () => Promise<void>; }


export function NovelStudioPage(props: {
  documents: NovelDocument[];
  rules: GenreRule[];
  onSuccess: () => Promise<void>;
}) {
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
    documentId,
    mode,
    focus,
    stylePrompt: currentStylePrompt,
    makeInstrumental,
    model,
    negativeTags,
    vocalGender,
    excerpt
  });
  const draftStale = Boolean(draftSignature) && draftSignature !== currentDraftSignature;

  function fallbackNovelTitle() {
    if (!activeDocument) {
      return "";
    }

    return `${activeDocument.title} · ${getNovelModeLabel(mode)}${makeInstrumental ? " · 纯音乐" : ""}`;
  }

  useEffect(() => {
    if (!props.documents.length) {
      if (documentId) {
        setDocumentId("");
      }

      return;
    }

    const stillExists = props.documents.some((document) => document.id === documentId);
    if (!stillExists) {
      setDocumentId(props.documents[0].id);
    }
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
      setImportMessage(`已导入文本:${document.title}`);
    } catch (error) {
      setImportMessage(toReadableErrorMessage(error));
    } finally {
      setImporting(false);
    }
  }

  async function importFile() {
    if (!selectedFile) {
      return;
    }

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
      setImportMessage(`已导入文件:${document.title}`);
    } catch (error) {
      setImportMessage(toReadableErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function generateDraft() {
    if (!documentId) {
      return;
    }

    setDraftLoading(true);
    setDraftMessage("");
    try {
      const draft = await fetchJson<NovelPromptDraft>("/api/generate/novel/preview", {
        method: "POST",
        body: JSON.stringify({
          documentId,
          mode,
          focus,
          stylePrompt: currentStylePrompt,
          makeInstrumental,
          model,
          negativeTags,
          vocalGender,
          excerpt
        })
      });
      setDraftTitle(draft.title.trim().length >= 2 ? draft.title : fallbackNovelTitle());
      setDraftPrompt(draft.prompt);
      setDraftStylePrompt(draft.stylePrompt);
      setDraftSignature(currentDraftSignature);
      setDraftMessage("提示词草稿已生成。你可以继续修改后再提交到 Suno。");
    } catch (error) {
      setDraftMessage(toReadableErrorMessage(error));
    } finally {
      setDraftLoading(false);
    }
  }

  async function generateNovelSong() {
    if (!documentId || !draftPrompt.trim()) {
      return;
    }

    setSubmitting(true);
    setDraftMessage("");
    try {
      await fetchJson("/api/generate/novel", {
        method: "POST",
        body: JSON.stringify({
          documentId,
          mode,
          focus,
          stylePrompt: draftStylePrompt.trim() || currentStylePrompt,
          makeInstrumental,
          model,
          negativeTags,
          vocalGender,
          excerpt,
          title: draftTitle.trim(),
          prompt: draftPrompt.trim()
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

  return (
    <div className="single-column novel-page">
      <Panel>
        <SectionTitle eyebrow="Import" title="导入全文" description="后端会自动切块、生成摘要和关键词，作为小说成歌的知识底座。" />
        <NovelImportSection
          title={title}
          text={text}
          selectedFile={selectedFile}
          fileInputKey={fileInputKey}
          importing={importing}
          uploading={uploading}
          importMessage={importMessage}
          documents={props.documents}
          documentId={documentId}
          onTitleChange={setTitle}
          onTextChange={setText}
          onImportDocument={importDocument}
          onFileSelect={(f) => setSelectedFile(f)}
          onImportFile={importFile}
          onSelectDocument={setDocumentId}
        />
      </Panel>

      <Panel>
        <SectionTitle eyebrow="Generate" title="小说成歌" description="先根据全文和节选生成 Suno 提示词草稿，再手动修改后提交。" />
        <div className="inline-message">
          摘要、角色提取和小说成歌草稿使用的 DeepSeek 系统提示词，已集中放到{" "}
          <Link className="inline-link" to="/assets">资产库</Link>{" "}里维护。
        </div>
        <NovelModeSelector mode={mode} makeInstrumental={makeInstrumental} onModeChange={setMode} onInstrumentalChange={setMakeInstrumental} />
        <div className="form-grid">
          <label>
            选择文档
            <select value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
              {!props.documents.length ? <option value="">请先在左侧导入文档</option> : null}
              {props.documents.map((document) => (
                <option key={document.id} value={document.id}>{document.title}</option>
              ))}
            </select>
            {!props.documents.length ? <span className="field-hint">导入成功后，这里会自动切换到最新文档。</span> : null}
          </label>
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
            <textarea value={focus} rows={3} onChange={(event) => setFocus(event.target.value)} />
          </label>
          <label className="full-span">
            风格补充
            <textarea value={customStyleNotes} rows={3} onChange={(event) => setCustomStyleNotes(event.target.value)} placeholder="例如：更强调宿命感、女声主唱、主歌更轻，副歌更炸裂。" />
          </label>
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
            节选内容或角色说明
            <textarea value={excerpt} rows={3} onChange={(event) => setExcerpt(event.target.value)} placeholder="可粘贴段落、对白、角色介绍等。" />
          </label>
        </div>
        {activeDocument ? (<div className="selected-doc-summary"><strong>{activeDocument.title}</strong><p>{activeDocument.summary}</p></div>) : null}
        {draftMessage ? <div className="inline-message">{draftMessage}</div> : null}
        <NovelDraftReview
          draftTitle={draftTitle}
          draftPrompt={draftPrompt}
          draftStylePrompt={draftStylePrompt}
          draftStale={draftStale}
          draftLoading={draftLoading}
          submitting={submitting}
          onTitleChange={setDraftTitle}
          onPromptChange={setDraftPrompt}
          onStylePromptChange={setDraftStylePrompt}
          onGenerateDraft={generateDraft}
          onSubmit={generateNovelSong}
        />
      </Panel>
    </div>
  );
}

