import { useEffect, useState } from "react";
import { Panel, Tag, cx } from "@ai-music/ui";
import type { AppSettings } from "@ai-music/types";
import { SectionTitle } from "../components/SectionTitle";
import { fetchJson } from "../hooks/useApi";
import { toReadableErrorMessage } from "../data/utils";

interface Props { onSaved: () => Promise<void>; }


export function SettingsPage(_props: Props) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const result = await fetchJson<AppSettings>("/api/settings");
        if (!cancelled) {
          setSettings(result);
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

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  function patchSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  const callbackEnabled = Boolean(settings?.sunoCallbackUrl.trim());

  async function saveSettings() {
    if (!settings) {
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const result = await fetchJson<AppSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(settings)
      });
      setSettings(result);
      setMessage("设置已保存，后端运行态已更新。可手动点击右上角“刷新数据”同步余额和状态。");
    } catch (error) {
      setMessage(toReadableErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="single-column settings-page">
        <Panel>
          <SectionTitle
            eyebrow="Settings"
            title="接口设置"
            description="正在加载当前运行配置。"
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="single-column settings-page">
      <Panel>
        <SectionTitle
          eyebrow="Runtime"
          title="接口设置"
          description="这里可以直接填写 Suno、DeepSeek 和火山引擎配置。保存后会持久化到服务端本地文件，并立刻作用于当前运行态。"
        />
        <div className="settings-toolbar">
          <div className="runtime-mode-card">
            <span className="toggle-label">运行模式</span>
            <div className="switch-row settings-mode-switch">
              <button
                className={cx("toggle-chip", !settings.mockMode && "toggle-chip-active")}
                onClick={() => patchSetting("mockMode", false)}
                type="button"
              >
                真实接口
              </button>
              <button
                className={cx("toggle-chip", settings.mockMode && "toggle-chip-active")}
                onClick={() => patchSetting("mockMode", true)}
                type="button"
              >
                Mock 模式
              </button>
            </div>
            <span className="field-hint">
              关闭 Mock 后，余额查询和歌曲生成会直接请求你填入的 Suno / DeepSeek 配置。
            </span>
          </div>
          <button className="primary-button" onClick={() => void saveSettings()} type="button">
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
        {message ? <div className="inline-message">{message}</div> : null}
      </Panel>

      <div className="two-column settings-grid">
        <Panel>
          <SectionTitle
            eyebrow="Suno"
            title="音乐生成接口"
            description="用于一键成歌、小说成歌、余额查询和任务状态同步。"
          />
          <div className="callback-card">
            <span className="toggle-label">Callback 回调</span>
            <div className="switch-row settings-mode-switch">
              <button
                className={cx("toggle-chip", !callbackEnabled && "toggle-chip-active")}
                onClick={() => patchSetting("sunoCallbackUrl", "")}
                type="button"
              >
                使用本地占位地址
              </button>
              <button
                className={cx("toggle-chip", callbackEnabled && "toggle-chip-active")}
                onClick={() =>
                  patchSetting(
                    "sunoCallbackUrl",
                    settings.sunoCallbackUrl || "https://your-public-domain/api/providers/suno/callback"
                  )
                }
                type="button"
              >
                启用公网回调
              </button>
            </div>
            <span className="field-hint">
              这个 provider 实际要求请求里带 `callBackUrl`。如果你不填，服务端会自动回退到本地占位地址，仅用于满足参数要求；真正的状态更新仍然依赖轮询。
            </span>
          </div>
          <div className="form-grid">
            <label className="full-span">
              API Key
              <input
                type="password"
                value={settings.sunoApiKey}
                onChange={(event) => patchSetting("sunoApiKey", event.target.value)}
                placeholder="输入 Suno API Key"
              />
            </label>
            <label>
              Base URL
              <input
                value={settings.sunoBaseUrl}
                onChange={(event) => patchSetting("sunoBaseUrl", event.target.value)}
              />
            </label>
            <label>
              Callback URL
              <input
                disabled={!callbackEnabled}
                value={settings.sunoCallbackUrl}
                onChange={(event) => patchSetting("sunoCallbackUrl", event.target.value)}
                placeholder="https://your-public-domain/api/providers/suno/callback"
              />
            </label>
            <label>
              Generate Path
              <input
                value={settings.sunoGeneratePath}
                onChange={(event) => patchSetting("sunoGeneratePath", event.target.value)}
              />
            </label>
            <label>
              Details Path
              <input
                value={settings.sunoDetailsPath}
                onChange={(event) => patchSetting("sunoDetailsPath", event.target.value)}
              />
            </label>
            <label className="full-span">
              Credits Path
              <input
                value={settings.sunoCreditsPath}
                onChange={(event) => patchSetting("sunoCreditsPath", event.target.value)}
              />
            </label>
          </div>
        </Panel>

        <div className="settings-stack">
          <Panel>
            <SectionTitle
              eyebrow="LLM"
              title="DeepSeek"
              description="用于全文摘要、角色提取、小说成歌提示词规划。"
            />
            <div className="form-grid">
              <label className="full-span">
                API Key
                <input
                  type="password"
                  value={settings.deepseekApiKey}
                  onChange={(event) => patchSetting("deepseekApiKey", event.target.value)}
                  placeholder="输入 DeepSeek API Key"
                />
              </label>
              <label>
                Base URL
                <input
                  value={settings.deepseekBaseUrl}
                  onChange={(event) => patchSetting("deepseekBaseUrl", event.target.value)}
                />
              </label>
              <label>
                Model
                <input
                  value={settings.deepseekModel}
                  onChange={(event) => patchSetting("deepseekModel", event.target.value)}
                />
              </label>
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              eyebrow="Cover"
              title="火山引擎"
              description="用于封面生成。当前仍是占位适配层，但配置已经可以从这里维护。"
            />
            <div className="form-grid">
              <label className="full-span">
                Access Key
                <input
                  type="password"
                  value={settings.volcengineAccessKey}
                  onChange={(event) => patchSetting("volcengineAccessKey", event.target.value)}
                />
              </label>
              <label className="full-span">
                Secret Key
                <input
                  type="password"
                  value={settings.volcengineSecretKey}
                  onChange={(event) => patchSetting("volcengineSecretKey", event.target.value)}
                />
              </label>
              <label>
                Region
                <input
                  value={settings.volcengineRegion}
                  onChange={(event) => patchSetting("volcengineRegion", event.target.value)}
                />
              </label>
              <label>
                Model
                <input
                  value={settings.volcengineImageModel}
                  onChange={(event) => patchSetting("volcengineImageModel", event.target.value)}
                />
              </label>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

