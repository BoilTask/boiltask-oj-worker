import { CrawlerResponse } from "./define";
import { ErrorCode } from "../error/code";

export class Crawler {
  getName() {
    return "";
  }

  async getTemplateText(request: Request, env: Env) {
    const assetUrl = new URL(`/template/${this.getName()}.md`, request.url);
    const templateResp = await env.ASSETS.fetch(assetUrl);
    return await templateResp.text();
  }

  async fetchContent(request: Request, env: Env, problem: string): Promise<CrawlerResponse> {
    return {
      code: ErrorCode.OjNotSupport,
    } as CrawlerResponse;
  }
}
