const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message.includes("Failed to fetch")
        ? "无法连接到本地后端，请确认 `npm run dev` 已启动，且 8787 端口可访问。"
        : error instanceof Error ? error.message : "网络请求失败"
    );
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? (payload as { message?: unknown }).message
        : null) ??
      (payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: unknown }).error
        : null) ??
      `${response.status} ${response.statusText}`;
    throw new Error(String(message ?? "未知错误"));
  }
  return (await response.json()) as T;
}
