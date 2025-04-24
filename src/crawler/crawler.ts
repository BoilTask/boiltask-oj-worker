import { CrawlerResponse } from "./define";
import { ErrorCode } from "../error/code";

export class Crawler {
  getName() {
    return "";
  }

  async getTargetTemplateText(request: Request, env: Env, target: string) {
    const assetUrl = new URL(`/template/${target}.md`, request.url);
    const templateResp = await env.ASSETS.fetch(assetUrl);
    return await templateResp.text();
  }

  async getTemplateText(request: Request, env: Env) {
    return this.getTargetTemplateText(request, env, this.getName());
  }

  async fetchContent(request: Request, env: Env, problem: string): Promise<CrawlerResponse> {
    return {
      code: ErrorCode.OjNotSupport,
    } as CrawlerResponse;
  }
}
