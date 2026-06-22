// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../../web/src/App";
import { renderWithRouter } from "./helpers/test-app";

const mockRules = [{ slug: "mandopop-cinematic", name: "test", bpmRange: "78-96", mood: ["a"], instruments: ["b"], arrangementNotes: ["c"] }];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes("/api/overview")) {
      return new Response(JSON.stringify({ account: { provider: "sunoapi", mode: "mock", creditsRemaining: 128, callbackConfigured: false, lastCheckedAt: null }, songs: [], tasks: [], documents: [], rules: mockRules }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/api/account")) {
      return new Response(JSON.stringify({ provider: "sunoapi", mode: "mock", creditsRemaining: 128 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/api/settings")) {
      return new Response(JSON.stringify({ mockMode: true, sunoApiKey: "", deepseekModel: "deepseek-chat" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});

describe("Dashboard", () => {
  it("brand and title", async () => {
    renderWithRouter(<App />);
    await waitFor(() => {
      expect(screen.getByText("AI Music Studio")).toBeInTheDocument();
      const all = screen.getAllByText(/音乐/);
      expect(all.length).toBeGreaterThan(0);
    });
  });

  it("stats show mock mode", async () => {
    renderWithRouter(<App />);
    await waitFor(() => {
      expect(screen.getByText("Mock")).toBeInTheDocument();
      expect(screen.getByText("128")).toBeInTheDocument();
    });
  });

  it("empty states present", async () => {
    renderWithRouter(<App />);
    await waitFor(() => {
      expect(screen.getByText(/还没有歌曲/)).toBeInTheDocument();
      expect(screen.getByText(/暂无任务/)).toBeInTheDocument();
    });
  });

  it("footer has secondary links", async () => {
    renderWithRouter(<App />);
    await waitFor(() => {
      expect(screen.getByText("提示词资产库")).toBeInTheDocument();
    });
  });
});

describe("Navigation", () => {
  it("click quick link navigates", async () => {
    renderWithRouter(<App />, { initialEntries: ["/"] });
    await waitFor(() => expect(screen.getByText("Mock")).toBeInTheDocument());
    const user = userEvent.setup();
    // 导航栏中的链接：.nav-link 元素
    const navLink = document.querySelector('.nav-link[href="/quick"]') as HTMLElement;
    await user.click(navLink);
    await waitFor(() => expect(screen.getByText(/提交 Suno 任务/)).toBeInTheDocument());
  });

  it("click docs footer navigates", async () => {
    renderWithRouter(<App />, { initialEntries: ["/"] });
    await waitFor(() => expect(screen.getByText("Mock")).toBeInTheDocument());
    const user = userEvent.setup();
    const docs = screen.getAllByText("文档");
    await user.click(docs[0]);
    await waitFor(() => expect(screen.getByText("项目文档")).toBeInTheDocument());
  });
});
