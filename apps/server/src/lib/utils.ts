import { createHash, randomUUID } from "node:crypto";

export const now = () => new Date().toISOString();

export function makeId(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function svgCoverDataUrl(title: string, accent = "#d9485f") {
  const safeTitle = title.slice(0, 32);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#201a35" />
        <stop offset="100%" stop-color="${accent}" />
      </linearGradient>
    </defs>
    <rect width="1200" height="1200" rx="80" fill="url(#bg)" />
    <circle cx="960" cy="220" r="180" fill="rgba(255,255,255,0.18)" />
    <circle cx="200" cy="980" r="220" fill="rgba(255,255,255,0.12)" />
    <text x="110" y="860" font-size="120" font-family="Arial" fill="#fff" opacity="0.92">AI Music</text>
    <text x="110" y="980" font-size="72" font-family="Arial" fill="#fff">${safeTitle}</text>
  </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

