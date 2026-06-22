import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, type RenderOptions } from "@testing-library/react";

/**
 * 用 MemoryRouter 包裹组件并渲染。用于测试内包含 <Routes> / <NavLink> 的组件。
 */
export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { initialEntries?: string[] }
) {
  const { initialEntries = ["/"], ...rest } = options ?? {};

  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    ),
    ...rest
  });
}

/**
 * 创建一个带默认 mock 返回值的 fetch 函数。
 * 每次调用 resetMockFetch() 清空。
 */
export type MockFetchStore = {
  fetch: typeof fetch;
  calls: RequestInfo[];
  reset: () => void;
};

export function createMockFetch(): MockFetchStore {
  let mockFn = vi.fn(async (_input: RequestInfo, _init?: RequestInit) => {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });

  const calls: RequestInfo[] = [];

  const wrappedFetch = (async (input: RequestInfo, init?: RequestInit) => {
    calls.push(input);
    return mockFn(input, init);
  }) as typeof fetch;

  vi.stubGlobal("fetch", wrappedFetch);

  return {
    fetch: wrappedFetch,
    calls,
    reset: () => {
      calls.length = 0;
      mockFn = vi.fn(async (_input: RequestInfo, _init?: RequestInit) => {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      });
      vi.stubGlobal("fetch", async (input: RequestInfo, init?: RequestInit) => {
        calls.push(input);
        return mockFn(input, init);
      });
    }
  };
}
