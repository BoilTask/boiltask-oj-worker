import { render, decodeHTMLToMarkdown } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import * as cheerio from "cheerio";

export class HduCrawler extends Crawler {
  getName() {
    return "hdu";
  }

  async fetchContent(request: Request, env: Env, problemId: string): Promise<CrawlerResponse> {
    const baseUrl = "https://acm.hdu.edu.cn/";
    const url = `${baseUrl}showproblem.php?pid=${problemId}`;
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder("gbk");
    const html = decoder.decode(buffer);

    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim();

    const contentMap: Record<string, string> = {};
    let currentSection = "";

    $(".panel_title, .panel_content").each((_, el) => {
      const $el = $(el);
      if ($el.hasClass("panel_title")) {
        currentSection = decodeHTMLToMarkdown($el.text().trim(), baseUrl);
      } else if ($el.hasClass("panel_content")) {
        contentMap[currentSection] = decodeHTMLToMarkdown($el.html().trim(), baseUrl);
      }
    });

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
            title,
            description: contentMap["Problem Description"] || "",
            input: contentMap["Input"] || "",
            output: contentMap["Output"] || "",
            sampleInput: contentMap["Sample Input"] || "",
            sampleOutput: contentMap["Sample Output"] || "",
            hint: contentMap["Hint"] ? "\n\n## Sample Output\n\n" + contentMap["Hint"] : "",
            author: contentMap["Author"] ? "\n\n## Author\n\n" + contentMap["Author"] : "",
            source: contentMap["Source"] ? "\n\n## Source\n\n" + contentMap["Source"] : "",
          }),
        },
      ],
    };
  }
}
