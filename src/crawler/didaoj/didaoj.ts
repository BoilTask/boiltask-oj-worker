import { render, decodeHTMLToMarkdown } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import * as cheerio from "cheerio";
import { ErrorCode } from "../../error/code";

export class DidaojCrawler extends Crawler {
  getName() {
    return "didaoj";
  }

  async fetchContent(request: Request, env: Env, problemId: string): Promise<CrawlerResponse> {
    const problemKey = `${this.getName()}-${problemId}`;
    const baseUrl = "https://oj.didapipa.com/";
    const url = `https://oj-api.didapipa.com/problem?id=${problemId}`;
    const res = await fetch(url);
    if (res.status !== 200) {
      return {
        code: ErrorCode.OjError,
        data: "Failed to fetch problem page",
      };
    }
    const responseData = (await res.json()) as any;
    if (responseData.code != 0) {
      return {
        code: ErrorCode.OjError,
        data: responseData.data || "Failed to fetch problem data",
      };
    }
    const problemData = responseData.data.problem;
    const title = problemData.title;
    const timeLimit = problemData.time_limit || "?";
    const memoryLimit = problemData.memory_limit || "?";
    const description = problemData.description;

    const templateText = await this.getTemplateText(request, env);

    return {
      code: 0,
      title,
      github_contents: [
        {
          path: `content/problem/didaoj/${problemId}/index.md`,
          content: render(templateText, {
            oj: "didaoj",
            problem: problemId,
            oj_title: "DidaOJ",
            title: title,
            timeLimit: timeLimit,
            memoryLimit: memoryLimit,
            description: description,
          }),
        },
      ],
    };
  }
}
