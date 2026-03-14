import type { Env } from "../config/env.js";
import { svgCoverDataUrl } from "../lib/utils.js";

export class VolcengineCoverClient {
  constructor(private readonly config: Env) {}

  async createCover(prompt: string, title: string) {
    if (this.config.mockMode || !this.config.volcengineAccessKey || !this.config.volcengineSecretKey) {
      return {
        imageUrl: svgCoverDataUrl(title),
        raw: {
          mode: "mock",
          prompt
        }
      };
    }

    return {
      imageUrl: svgCoverDataUrl(`${title} · Volcengine`, "#8b5cf6"),
      raw: {
        mode: "live-placeholder",
        prompt,
        note: "需要根据火山引擎账号实际鉴权方式补充签名请求。"
      }
    };
  }
}

