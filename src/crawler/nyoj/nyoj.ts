import { render, decodeHTMLToMarkdown } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import { ErrorCode } from "../../error/code";

export class NyojCrawler extends Crawler {
  getName() {
    return "nyoj";
  }

  async fetchContent(request: Request, env: Env, problem: string): Promise<CrawlerResponse> {
    const baseUrl = "https://xcpc.nyist.edu.cn/";
    const targetUrl = `${baseUrl}api/get-problem-detail?problemId=` + problem;
    const res = await fetch(targetUrl);
    const json = (await res.json()) as any;

    if (json.status != 200) {
      const response = {
        code: ErrorCode.OjError,
        data: json.msg,
      };
      if (json.status == 403) {
        response.code = ErrorCode.ProblemPrivate;
      }
      return response;
    }

    const problemData = json.data.problem;
    if (!problemData) {
      return {
        code: ErrorCode.OjError,
        data: json.msg,
      };
    }

    const { title, description, input, output, examples, source, hint } = problemData;

    const templateText = await this.getTemplateText(request, env);

    const finalExamples = examples
      .replace(/<input>/g, '<h3>Input</h3><pre>')
      .replace(/<\/input>/g, '</pre><br/>')
      .replace(/<output>/g, '<h3>Output</h3><pre>')
      .replace(/<\/output>/g, '</pre><br/>');

    return {
      code: 0,
      title: title,
      github_contents: [
        {
          path: `content/problem/nyoj/${problem}/index.md`,
          content: render(templateText, {
            oj: "nyoj",
            problem: problem,
            oj_title: "NYOJ",
            title: decodeHTMLToMarkdown(title, baseUrl),
            description: decodeHTMLToMarkdown(description, baseUrl),
            input: decodeHTMLToMarkdown(input, baseUrl),
            output: decodeHTMLToMarkdown(output, baseUrl),
            examples: decodeHTMLToMarkdown(finalExamples, baseUrl),
            source: decodeHTMLToMarkdown(source, baseUrl),
            hint: decodeHTMLToMarkdown(hint, baseUrl) || "无",
          }),
        },
      ],
    };
  }
}
