import type { LibrarySnapshot } from "@ai-music/types";
import { genreRules } from "@ai-music/config";

/**
 * 构造一个用于测试的初始 LibrarySnapshot。
 * 调用方可以传入 partial 覆盖默认字段。
 */
export function buildSnapshot(overrides: Partial<LibrarySnapshot> = {}): LibrarySnapshot {
  return {
    account: {
      provider: "sunoapi",
      mode: "mock",
      creditsRemaining: 100,
      callbackConfigured: false,
      lastCheckedAt: null
    },
    songs: [],
    tasks: [],
    documents: [],
    rules: genreRules,
    ...overrides
  };
}

/**
 * 内存中的快照存储，替代文件 IO。
 * 每个测试文件调用 createInMemoryStore() 获取独立实例。
 */
export function createInMemoryStore(initial?: LibrarySnapshot) {
  let snapshot: LibrarySnapshot = initial ?? buildSnapshot();

  async function readSnapshot(): Promise<LibrarySnapshot> {
    return snapshot;
  }

  async function writeSnapshot(next: LibrarySnapshot): Promise<void> {
    snapshot = next;
  }

  async function updateSnapshot(
    mutator: (s: LibrarySnapshot) => LibrarySnapshot | Promise<LibrarySnapshot>
  ): Promise<LibrarySnapshot> {
    snapshot = await mutator(snapshot);
    return snapshot;
  }

  // 暴露内部状态用于断言
  function getState(): LibrarySnapshot {
    return snapshot;
  }

  function reset(next?: LibrarySnapshot) {
    snapshot = next ?? buildSnapshot();
  }

  return { readSnapshot, writeSnapshot, updateSnapshot, getState, reset };
}

export type InMemoryStore = ReturnType<typeof createInMemoryStore>;
