import { render, decodeHTML } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import { ErrorCode } from "../../error/code";

export class NyojCrawler extends Crawler {
  getName() {
    return "nyoj";
  }

  async fetchContent(request: Request, env: Env, problem: string): Promise<CrawlerResponse> {
    const targetUrl = "https://xcpc.nyist.edu.cn/api/get-problem-detail?problemId=" + problem;
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
            title: decodeHTML(title),
            description: decodeHTML(description),
            input: decodeHTML(input),
            output: decodeHTML(output),
            examples: decodeHTML(examples),
            source: decodeHTML(source),
            hint: decodeHTML(hint) || "无",
          }),
        },
      ],
    };
  }
}
