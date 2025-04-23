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
    const decoder = new TextDecoder("gbk");
    const html = decoder.decode(buffer);

    const $ = cheerio.load(html);

    let title = $(".header > .title").text().trim();
    title = title.replace(/^[A-Z]\.\s*/, "");

    const problemStatement = $(".problem-statement");

    const timeLimit = problemStatement.find(".header > .time-limit").eq(0).remove().text().trim();
    const memoryLimit = problemStatement.find(".header > .memory-limit").eq(0).remove().text().trim();

    const divList = $(".problem-statement > div");

    const description = decodeHTMLToMarkdown(divList.eq(1).html(), baseUrl);
    const input = decodeHTMLToMarkdown(divList.eq(2).html(), baseUrl);
    const output = decodeHTMLToMarkdown(divList.eq(3).html(), baseUrl);

    let sampleHtml = divList.eq(4).html();
    sampleHtml.replace(/<div class="section-title">Examples<\/div>/, "");
    sampleHtml = sampleHtml.replace(/<div class="title">Input<\/div>/, '<h3>Input</h3>');
    sampleHtml = sampleHtml.replace(/<div class="title">Output<\/div>/, '<h3>Output</h3>');
    const sample = decodeHTMLToMarkdown(sampleHtml, baseUrl);

    let hint = null;
    if (divList.eq(5)) {
      hint = decodeHTMLToMarkdown(divList.eq(5).html(), baseUrl);
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
