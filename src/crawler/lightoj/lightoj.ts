import { decodeHTMLToMarkdown, render } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import * as cheerio from "cheerio";

export class LightojCrawler extends Crawler {
  getName() {
    return "lightoj";
  }

  async fetchContent(request: Request, env: Env, problemId: string): Promise<CrawlerResponse> {
    const baseUrl = "https://lightoj.com/";
    const url = `${baseUrl}problem/${problemId}`;
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    const decoder = new TextDecoder("utf-8");
    const html = decoder.decode(buffer);

    const $ = cheerio.load(html);
    const title = $(".title").text().trim();

    const limitDivs = $("div.b-tooltip.is-light.is-bottom.is-small.is-multiline .tooltip-trigger");

    const timeLimit = limitDivs.eq(0).text().trim();
    const memoryLimit = limitDivs.eq(1).text().trim();

    const cardDiv = $(".card.is-post.has-shadow.is-radiusless .card-body");

    const markdownBody = cardDiv.find(".markdown-body");

    const description = decodeHTMLToMarkdown(markdownBody.eq(0).html(), baseUrl);
    const input = decodeHTMLToMarkdown(markdownBody.eq(1).html(), baseUrl);
    const output = decodeHTMLToMarkdown(markdownBody.eq(2).html(), baseUrl);

    let hint = null;
    const hintElement = cardDiv.find(".post-text > div").eq(4);
    if (hintElement.html()) {
      hint = decodeHTMLToMarkdown(hintElement.find(".markdown-body").html(), baseUrl);
    }

    const sampleBody = cardDiv.find(".dataset-container");
    const sampleInput = "```\n" + sampleBody.eq(0).text() + "\n```";
    const sampleOutput = "```\n" + sampleBody.eq(1).text() + "\n```";

    const templateText = await this.getTemplateText(request, env);

    return {
      code: 0,
      title,
      github_contents: [
        {
          path: `content/problem/lightoj/${problemId}/index.md`,
          content: render(templateText, {
            oj: "lightoj",
            problem: problemId,
            oj_title: "LightOJ",
            title: title,
            timeLimit: timeLimit,
            memoryLimit: memoryLimit,
            description: description,
            input: input,
            output: output,
            sampleInput: sampleInput,
            sampleOutput: sampleOutput,
            hint: hint ? `\n\n## Notes\n\n${hint}` : "",
            // author: "", // 可根据其他字段拓展
            // source: "", // 可根据其他字段拓展
          }),
        },
      ],
    };
  }
}
