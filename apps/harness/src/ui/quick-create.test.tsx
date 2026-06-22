// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../../web/src/App";
import { renderWithRouter } from "./helpers/test-app";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, _init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/overview")) {
        return new Response(
          JSON.stringify({
            account: {
              provider: "sunoapi",
              mode: "mock",
              creditsRemaining: 128,
              callbackConfigured: false,
              lastCheckedAt: null
            },
            songs: [],
            tasks: [],
            documents: [],
            rules: [
              {
                slug: "mandopop-cinematic",
                name: "华语流行电影感",
                bpmRange: "78-96 BPM",
                mood: ["抒情"],
                instruments: ["钢琴", "弦乐"],
                arrangementNotes: ["主歌保持留白"]
              },
              {
                slug: "electro-pop",
                name: "电子流行",
                bpmRange: "100-124 BPM",
                mood: ["明亮"],
                instruments: ["合成器"],
                arrangementNotes: ["Drop 前需要 build-up"]
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/account")) {
        return new Response(
          JSON.stringify({
            provider: "sunoapi",
            mode: "mock",
            creditsRemaining: 128,
            callbackConfigured: false,
            lastCheckedAt: null
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/generate/quick")) {
        return new Response(
          JSON.stringify({
            id: "song_test001",
            title: "测试歌曲",
            mode: "quick",
            status: "generating",
            taskId: "task_test001",
            providerJobId: null,
            prompt: "写一首关于凌晨城市、霓虹和独自赶路的华语流行歌曲",
            stylePrompt: "华语流行电影感，节奏 78-96 BPM",
            makeInstrumental: false,
            model: "V4_5ALL",
            negativeTags: "",
            vocalGender: "",
            lyricsSnippet: "",
            tags: [],
            audioUrl: null,
            coverUrl: "data:image/svg+xml,...",
            coverStatus: "idle",
            durationSeconds: null,
            sourceDocumentId: null,
            sourceExcerpt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/settings")) {
        return new Response(
          JSON.stringify({
            mockMode: true,
            sunoApiKey: "",
            sunoBaseUrl: "",
            sunoGeneratePath: "",
            sunoDetailsPath: "",
            sunoCreditsPath: "",
            sunoCallbackUrl: "",
            deepseekApiKey: "",
            deepseekBaseUrl: "",
            deepseekModel: "deepseek-chat",
            volcengineAccessKey: "",
            volcengineSecretKey: "",
            volcengineRegion: "cn-north-1",
            volcengineImageModel: "dreamina-v3.1"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/songs")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url.includes("/api/tasks")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    })
  );
});

describe("Quick Create Page", () => {
  async function navigateToQuick() {
    renderWithRouter(<App />, { initialEntries: ["/"] });

    await waitFor(() => {
      expect(screen.getByText("AI Music Studio")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    // 导航栏中的链接（页面中"一键成歌"出现多次：nav link + dashboard card）
    const navLinks = screen.getAllByText("一键成歌");
    await user.click(navLinks[0]);

    await waitFor(() => {
      expect(screen.getByText("提交 Suno 任务")).toBeInTheDocument();
    });
  }

  it("渲染一键成歌表单", async () => {
    await navigateToQuick();

    // 标题输入框
    expect(screen.getByDisplayValue("夜航城市")).toBeInTheDocument();

    // 风格选择器
    const styleSelect = screen.getByDisplayValue("华语流行电影感");
    expect(styleSelect).toBeInTheDocument();

    // 模型选择器
    const modelSelect = screen.getByDisplayValue("V4.5 All");
    expect(modelSelect).toBeInTheDocument();

    // 提交按钮
    expect(screen.getByText("提交 Suno 任务")).toBeInTheDocument();
  });

  it("修改标题输入框内容", async () => {
    await navigateToQuick();

    const user = userEvent.setup();
    const titleInput = screen.getByDisplayValue("夜航城市");
    await user.clear(titleInput);
    await user.type(titleInput, "我的自定义标题");

    expect(screen.getByDisplayValue("我的自定义标题")).toBeInTheDocument();
  });

  it("切换纯音乐复选框", async () => {
    await navigateToQuick();

    const user = userEvent.setup();
    const checkbox = screen.getByLabelText("仅生成纯音乐");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("点击提交按钮发送 API 请求", async () => {
    // 使用 beforeEach 中设置的 fetch mock，不额外覆盖
    await navigateToQuick();

    const user = userEvent.setup();
    const submitButton = screen.getByText("提交 Suno 任务");
    await user.click(submitButton);

    // 验证提交后没有错误（fetch mock 返回 201，不会出现错误 banner）
    await waitFor(() => {
      const errorBanners = screen.queryAllByText(/接口错误/);
      expect(errorBanners.length).toBe(0);
    });
  });
});
