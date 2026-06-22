import { cx } from "@ai-music/ui";
import { novelModeOptions } from "../data/options";

interface Props {
  mode: string;
  makeInstrumental: boolean;
  onModeChange: (v: string) => void;
  onInstrumentalChange: (v: boolean) => void;
}

export function NovelModeSelector(props: Props) {
  return (
    <div>
      <div className="card-grid compact">
        {novelModeOptions.map((opt) => (
          <button key={opt.value} className={cx("mode-card", props.mode === opt.value && "mode-card-active")} onClick={() => props.onModeChange(opt.value)} type="button">
            {opt.label}
          </button>
        ))}
      </div>
      <div className="toggle-block">
        <span className="toggle-label">生成类型</span>
        <div className="switch-row">
          <button className={cx("toggle-chip", !props.makeInstrumental && "toggle-chip-active")} onClick={() => props.onInstrumentalChange(false)} type="button">
            生成人声歌曲
          </button>
          <button className={cx("toggle-chip", props.makeInstrumental && "toggle-chip-active")} onClick={() => props.onInstrumentalChange(true)} type="button">
            生成纯音乐
          </button>
        </div>
      </div>
    </div>
  );
}
