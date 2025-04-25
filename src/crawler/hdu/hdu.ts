import { render, decodeHTMLToMarkdown } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import * as cheerio from "cheerio";

export class HduCrawler extends Crawler {
  getName() {
    return "hdu";
  }

  async fetchContent(request: Request, env: Env, problemId: string): Promise<CrawlerResponse> {
    const problemKey = `${this.getName()}-${problemId}`;

    const baseUrl = "https://acm.hdu.edu.cn/";
    const url = `${baseUrl}showproblem.php?pid=${problemId}`;
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder("gbk");
    const html = decoder.decode(buffer);

    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim();

    const tbodyText = $("tbody").text();

    const limitMatch = tbodyText.match(/Time Limit: ([\s\S]+?) \(Java\/Others\)\s+Memory Limit: ([\s\S]+?) \(Java\/Others\)/);

    const timeLimit = limitMatch ? limitMatch[1] : "?";
    const memoryLimit = limitMatch ? limitMatch[2] : "?";

    const contentMap: Record<string, string> = {};
    let currentSection = "";

    const panels = $(".panel_title, .panel_content");
    for (const el of panels) {
      const $el = $(el);
      if ($el.hasClass("panel_title")) {
        currentSection = await decodeHTMLToMarkdown(env, problemId, $el.text().trim(), baseUrl);
      } else if ($el.hasClass("panel_content")) {
        contentMap[currentSection] = await decodeHTMLToMarkdown(env, problemId, $el.html().trim(), baseUrl);
      }
    }

    const templateText = await this.getTemplateText(request, env); // 你已有的方法

    return {
      code: 0,
      title: title,
      github_contents: [
        {
          path: `content/problem/hdu/${problemId}/index.md`,
          content: render(templateText, {
            oj: "hdu",
            problem: problemId,
            oj_title: "HDU",
            title: title,
            timeLimit: timeLimit,
            memoryLimit: memoryLimit,
            description: contentMap["Problem Description"] || "",
            input: contentMap["Input"] || "",
            output: contentMap["Output"] || "",
            sampleInput: contentMap["Sample Input"] || "",
            sampleOutput: contentMap["Sample Output"] || "",
            hint: contentMap["Hint"] ? "\n\n## Hint\n\n" + contentMap["Hint"] : "",
            author: contentMap["Author"] ? "\n\n## Author\n\n" + contentMap["Author"] : "",
            source: contentMap["Source"] ? "\n\n## Source\n\n" + contentMap["Source"] : "",
          }),
        },
      ],
    };
  }
}
