import { render, decodeHTMLToMarkdown } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import * as cheerio from "cheerio";
import { ErrorCode } from "../../error/code";

export class PojCrawler extends Crawler {
  getName() {
    return "poj";
  }

  async fetchContent(request: Request, env: Env, problemId: string): Promise<CrawlerResponse> {
    const problemKey = `${this.getName()}-${problemId}`;
    const baseUrl = "https://web.archive.org/web/http://poj.org/";
    const url = `${baseUrl}problem?id=${problemId}`;
    const res = await fetch(url);
    if (res.status !== 200) {
      return {
        code: ErrorCode.OjError,
        data: "Failed to fetch problem page",
      };
    }

    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder("utf-8");
    const html = decoder.decode(buffer);

    const $ = cheerio.load(html);

    const title = $(".ptt").text().trim();

    const bodyText = $("body").html();

    const timeLimitMatch = bodyText.match(/<td><b>Time Limit:<\/b> ([\s\S]+?)<\/td>/);
    const timeLimit = timeLimitMatch ? timeLimitMatch[1] : "?";
    const memoryLimitMatch = bodyText.match(/<td><b>Memory Limit:<\/b> ([\s\S]+?)<\/td>/);
    const memoryLimit = memoryLimitMatch ? memoryLimitMatch[1] : "?";

    const contentMap: Record<string, string> = {};
    let currentSection = "";

    const panels = $(".pst, .ptx");
    for (const el of panels) {
      const $el = $(el);
      if ($el.hasClass("pst")) {
        currentSection = await decodeHTMLToMarkdown(env, problemId, $el.text().trim(), baseUrl);
      } else if ($el.hasClass("ptx")) {
        contentMap[currentSection] = await decodeHTMLToMarkdown(env, problemId, $el.html().trim(), baseUrl);
      }
    }

    const sourceDivs = $(".sio");
    const sampleInput = "```\n" + sourceDivs.eq(0).text() + "\n```";
    const sampleOutput = "```\n" + sourceDivs.eq(1).text() + "\n```";

    const templateText = await this.getTemplateText(request, env);

    return {
      code: 0,
      title: title,
      github_contents: [
        {
          path: `content/problem/poj/${problemId}/index.md`,
          content: render(templateText, {
            oj: "poj",
            problem: problemId,
            oj_title: "POJ",
            title: title,
            timeLimit: timeLimit,
            memoryLimit: memoryLimit,
            description: contentMap["Description"] || "",
            input: contentMap["Input"] || "",
            output: contentMap["Input"] || "",
            sampleInput: sampleInput || "",
            sampleOutput: sampleOutput || "",
            hint: contentMap["Hint"] ? "\n\n## Hint\n\n" + contentMap["Hint"] : "",
            source: contentMap["Source"] ? "\n\n## Source\n\n" + contentMap["Source"] : "",
          }),
        },
      ],
    };
  }
}
