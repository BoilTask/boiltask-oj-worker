import { render, decodeHTMLToMarkdown } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import * as cheerio from "cheerio";
import { ErrorCode } from "../../error/code";

export class CodeforcesCrawler extends Crawler {
  getName() {
    return "codeforces";
  }

  async fetchContent(request: Request, env: Env, problemId: string): Promise<CrawlerResponse> {
    const baseUrl = "https://codeforces.com/";
    const problemKey = `${this.getName()}-${problemId}`;

    const match = problemId.match(/(\d+)(\S+)/);
    const contestId = match[1];
    const problemName = match[2];

    const myHeaders = new Headers();
    myHeaders.append("User-Agent", "BoilTask OJ backup problem");
    myHeaders.append("Accept", "*/*");
    myHeaders.append("Host", "codeforces.com");
    myHeaders.append("Connection", "keep-alive");
    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };
    const url = `${baseUrl}/problemset/problem/${contestId}/${problemName}`;
    const res = await fetch(url, requestOptions);
    if (res.status !== 200) {
      return {
        code: ErrorCode.OjError,
        data: "Failed to fetch problem page",
      };
    }
    const buffer = await res.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(buffer);

    const $ = cheerio.load(html);

    let title = $(".header > .title").text().trim();
    title = title.replace(/^[\S+]\.\s*/, "");

    const problemStatement = $(".problem-statement");

    const timeDiv = problemStatement.find(".header > .time-limit");
    timeDiv.find(".property-title").remove();
    const timeLimit = timeDiv.text().trim();
    const memoryDiv = problemStatement.find(".header > .memory-limit");
    memoryDiv.find(".property-title").remove();
    const memoryLimit = memoryDiv.text().trim();

    const divList = $(".problem-statement > div");

    let description = "This problem has no description.";
    const descriptionDiv = divList.eq(1);
    if (!descriptionDiv.hasClass("input-specification")) {
      // 如果包含input-specification类，则跳过
      if (descriptionDiv.find(".input-specification").length <= 0 && descriptionDiv.find(".output-specification").length <= 0) {
        description = await decodeHTMLToMarkdown(env, problemKey, descriptionDiv.html(), baseUrl);
      }
    }
    // 获取divList中具有"input-specification"类的div
    const inputDiv = problemStatement.find(".input-specification");
    inputDiv.find(".section-title").remove();
    const input = await decodeHTMLToMarkdown(env, problemKey, inputDiv.html(), baseUrl);
    const outputDiv = problemStatement.find(".output-specification");
    outputDiv.find(".section-title").remove();
    const output = await decodeHTMLToMarkdown(env, problemKey, outputDiv.html(), baseUrl);

    const sampleDiv = problemStatement.find(".sample-tests");
    sampleDiv.find(".section-title").remove();
    let sampleHtml = sampleDiv.html();
    let sample = null;
    if (sampleHtml) {
      sampleHtml = sampleHtml.replaceAll(/<div class="title">Input<\/div>/g, "<h3>Input</h3>");
      sampleHtml = sampleHtml.replaceAll(/<div class="title">Output<\/div>/g, "<h3>Output</h3>");
      sample = await decodeHTMLToMarkdown(env, problemKey, sampleHtml, baseUrl);
    }

    let hint = null;
    const hintDiv = problemStatement.find(".note");
    if (hintDiv.html()) {
      hintDiv.find(".section-title").remove();
      hint = await decodeHTMLToMarkdown(env, problemKey, hintDiv.html(), baseUrl);
    }

    const templateText = await this.getTemplateText(request, env); // 你已有的方法

    return {
      code: 0,
      title: title,
      github_contents: [
        {
          path: `content/problem/codeforces/${problemId}/index.md`,
          content: render(templateText, {
            oj: "codeforces",
            problem: problemId,
            oj_title: "Codeforces",
            title: title,
            timeLimit: timeLimit,
            memoryLimit: memoryLimit,
            description: description || "",
            input: input || "",
            output: output || "",
            sample: sample ? "\n\n## Examples\n\n" + sample : "",
            hint: hint ? "\n\n## Note\n\n" + hint : "",
          }),
        },
      ],
    };
  }
}
