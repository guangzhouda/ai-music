import { vi } from "vitest";

/**
 * 全局 setup：在每次测试文件加载时执行。
 * 处理已知的无害 unhandled rejection（如 finishSong 在 store 重置后触发）。
 */
process.on("unhandledRejection", (reason) => {
  if (reason instanceof Error && reason.message === "Task not found") {
    // finishSong 在 store.reset() 之后回调 refreshTask → 正常清理噪声，忽略
    return;
  }
  // 其他错误仍然暴露
  console.error("[unhandledRejection]", reason);
});
