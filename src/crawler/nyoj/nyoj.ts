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

    let finalExamples = examples
      .replace(/<input>/g, "<h3>用例输入</h3><pre>")
      .replace(/<\/input>/g, "</pre><br/>")
      .replace(/<output>/g, "<h3>用例输出</h3><pre>")
      .replace(/<\/output>/g, "</pre><br/>");
    finalExamples = decodeHTMLToMarkdown(finalExamples, baseUrl);

    const finalDescription = decodeHTMLToMarkdown(description, baseUrl);

    let finalInput = input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    finalInput = decodeHTMLToMarkdown(finalInput, baseUrl);

    let finalOutput = output.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    finalOutput = decodeHTMLToMarkdown(finalOutput, baseUrl);

    const finalHint = decodeHTMLToMarkdown(hint, baseUrl);
    const finalSource = decodeHTMLToMarkdown(source, baseUrl);

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
            description: finalDescription,
            input: finalInput,
            output: finalOutput,
            examples: finalExamples,
            hint: finalHint ? "\n\n## 提示\n\n" + finalHint : "",
            source: finalSource ? "\n\n## 来源\n\n" + finalSource : "",
          }),
        },
      ],
    };
  }
}
