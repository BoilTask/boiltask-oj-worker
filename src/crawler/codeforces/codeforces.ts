import { render, decodeHTMLToMarkdown } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import * as cheerio from "cheerio";

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

    const description = await decodeHTMLToMarkdown(env, problemKey, divList.eq(1).html(), baseUrl);

    const inputDiv = divList.eq(2);
    inputDiv.find("div").remove();
    const input = await decodeHTMLToMarkdown(env, problemKey, inputDiv.html(), baseUrl);
    const outputDiv = divList.eq(3);
    outputDiv.find("div").remove();
    const output = await decodeHTMLToMarkdown(env, problemKey, outputDiv.html(), baseUrl);

    const sampleDiv = divList.eq(4);
    sampleDiv.find(".section-title").remove();
    let sampleHtml = sampleDiv.html();
    sampleHtml = sampleHtml.replaceAll(/<div class="title">Input<\/div>/g, "<h3>Input</h3>");
    sampleHtml = sampleHtml.replaceAll(/<div class="title">Output<\/div>/g, "<h3>Output</h3>");
    const sample = await decodeHTMLToMarkdown(env, problemKey, sampleHtml, baseUrl);

    let hint = null;
    if (divList.eq(5).html()) {
      const hintDiv = divList.eq(5);
      hintDiv.find("div").remove();
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
            sample: sample || "",
            hint: hint ? "\n\n## Note\n\n" + hint : "",
          }),
        },
      ],
    };
  }
}
