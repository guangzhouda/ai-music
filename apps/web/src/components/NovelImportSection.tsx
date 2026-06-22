import type { NovelDocument } from "@ai-music/types";
import { cx } from "@ai-music/ui";

interface Props {
  title: string;
  text: string;
  selectedFile: File | null;
  fileInputKey: number;
  importing: boolean;
  uploading: boolean;
  importMessage: string;
  documents: NovelDocument[];
  documentId: string;
  onTitleChange: (v: string) => void;
  onTextChange: (v: string) => void;
  onImportDocument: () => void;
  onFileSelect: (f: File | null) => void;
  onImportFile: () => void;
  onSelectDocument: (id: string) => void;
}

export function NovelImportSection(props: Props) {
  return (
    <div>
      <div className="form-grid">
        <label>
          文本标题
          <input value={props.title} onChange={(e) => props.onTitleChange(e.target.value)} />
        </label>
        <label className="full-span">
          正文
          <textarea placeholder="粘贴整篇小说、章节或长文内容。" rows={8} value={props.text} onChange={(e) => props.onTextChange(e.target.value)} />
        </label>
      </div>
      <div className="import-actions">
        <button className="primary-button" onClick={() => void props.onImportDocument()} type="button">
          {props.importing ? "导入中..." : "导入正文"}
        </button>
        <div className="upload-box upload-box-inline">
          <strong>文件导入</strong>
          <label className="file-picker">
            <input key={props.fileInputKey} accept=".txt,.md,.docx,.pdf" onChange={(e) => props.onFileSelect(e.target.files?.[0] ?? null)} type="file" />
            <span>{props.selectedFile ? props.selectedFile.name : "选择 txt / md / docx / pdf"}</span>
          </label>
          <button className="ghost-button" disabled={!props.selectedFile || props.uploading} onClick={() => void props.onImportFile()} type="button">
            {props.uploading ? "上传中..." : "上传并导入"}
          </button>
        </div>
      </div>
      {props.importMessage ? <div className="inline-message">{props.importMessage}</div> : null}
      <div className="imported-docs">
        <strong>已导入文档</strong>
        {props.documents.length === 0 ? (
          <p className="import-note">当前还没有文档。导入后会自动选中最新文档用于下方生成。</p>
        ) : (
          <div className="stack-list compact-scroll imported-doc-list">
            {props.documents.map((doc) => (
              <button key={doc.id} className={cx("doc-pick", props.documentId === doc.id && "doc-pick-active")} onClick={() => props.onSelectDocument(doc.id)} type="button">
                <span>{doc.title}</span>
                <small>{doc.chunks.length} chunks · {doc.characters.slice(0, 3).join("、") || "待分析"}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
