interface Props {
  draftTitle: string;
  draftPrompt: string;
  draftStylePrompt: string;
  draftStale: boolean;
  draftLoading: boolean;
  submitting: boolean;
  onTitleChange: (v: string) => void;
  onPromptChange: (v: string) => void;
  onStylePromptChange: (v: string) => void;
  onGenerateDraft: () => void;
  onSubmit: () => void;
}

export function NovelDraftReview(props: Props) {
  return (
    <div>
      <div className="form-actions">
        <button className="ghost-button" disabled={props.draftLoading} onClick={() => void props.onGenerateDraft()} type="button">
          {props.draftLoading ? "生成草稿中..." : "先生成提示词草稿"}
        </button>
        <button className="primary-button" disabled={!props.draftPrompt.trim() || props.draftStale || props.submitting} onClick={() => void props.onSubmit()} type="button">
          {props.submitting ? "提交中..." : "提交到 Suno"}
        </button>
      </div>
      {props.draftStale ? <div className="inline-message">参数已变更，请先重新生成提示词草稿，再提交到 Suno。</div> : null}
      <div className="form-grid prompt-review-grid">
        <label className="full-span">
          最终歌名
          <input value={props.draftTitle} onChange={(e) => props.onTitleChange(e.target.value)} placeholder={'先点击"生成提示词草稿"'} />
        </label>
        <label className="full-span">
          最终提交给 Suno 的歌词/内容提示词
          <textarea value={props.draftPrompt} rows={10} onChange={(e) => props.onPromptChange(e.target.value)} placeholder="这里会显示 AI 基于全文生成的歌词/内容提示词，你可以直接修改。" />
          <span className="field-hint">
            Suno 会直接使用这里的内容进行歌曲生成。对人声歌曲来说，这一段通常会强烈影响歌词和叙事。建议避免真实歌手名、艺人名、品牌名和其他敏感词，优先改写成虚构、抽象、中性的表达。
          </span>
        </label>
        <label className="full-span">
          最终提交给 Suno 的风格提示词
          <textarea value={props.draftStylePrompt} rows={4} onChange={(e) => props.onStylePromptChange(e.target.value)} placeholder="这里会显示最终风格文本。" />
        </label>
      </div>
    </div>
  );
}
