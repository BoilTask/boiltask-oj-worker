import { render, decodeHTMLToMarkdown, fixRelativeLinks } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import { ErrorCode } from "../../error/code";
import * as cheerio from "cheerio";

export class NyojCrawler extends Crawler {
  getName() {
    return "nyoj";
  }

  async fetchContent(request: Request, env: Env, problem: string): Promise<CrawlerResponse> {
    const acmFlag = "acm-";
    if (problem.startsWith(acmFlag)) {
      const acmProblem = problem.substring(acmFlag.length);
      const baseUrl = "https://acm.nyist.edu.cn/";
      const apiUrl = `${baseUrl}api`;
      const postData = {
        query: `query {
          problem(pid: "${acmProblem}") {
            _id
            title
            content
          }
        }`,
      };
      const headers = {
        "Content-Type": "application/json",
      };
      const options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(postData),
      };
      const resJson = await fetch(apiUrl, options);
      const json = (await resJson.json()) as any;
      if (json.errors) {
        return {
          code: ErrorCode.OjError,
          data: json.errors[0].message,
        };
      }
      const problemData = json.data.problem;
      if (!problemData) {
        return {
          code: ErrorCode.OjError,
          data: json.errors[0].message,
        };
      }
      const { title, content } = problemData;
      if (!content) {
        return {
          code: ErrorCode.OjError,
          data: "题目不存在",
        };
      }

      const finalContent = fixRelativeLinks(content, baseUrl);

      const targetUrl = `${baseUrl}p/${acmProblem}`;
      const res = await fetch(targetUrl);
      const buffer = await res.arrayBuffer();
      const html = new TextDecoder("utf-8").decode(buffer);
      const $ = cheerio.load(html);
      const timeDiv = $(".bp5-tag.bp5-large.bp5-minimal.problem__tag-item.icon.icon-stopwatch");
      const timeLimit = timeDiv.text();
      const memoryDiv = $(".bp5-tag.bp5-large.bp5-minimal.problem__tag-item.icon.icon-comparison");
      const memoryLimit = memoryDiv.text();

      const templateText = await this.getTargetTemplateText(request, env, "nyoj-acm");

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
              title: title,
              description: finalContent,
              timeLimit: timeLimit,
              memoryLimit: memoryLimit,
            }),
          },
        ],
      };
    }

    const baseUrl = "https://xcpc.nyist.edu.cn/";

    // {"query":"query {\n  problem(pid: \"135\") {\n    _id\n    title\n    content\n  }\n}"}

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

    const { title, timeLimit, memoryLimit, description, input, output, examples, hint, author, source } = problemData;

    const finalTimeLimit = timeLimit + " MS";
    const finalMemoryLimit = memoryLimit + " MB";

    let finalExamples = examples
      .replace(/<input>/g, "<h3>用例输入</h3><pre>")
      .replace(/<\/input>/g, "</pre><br/>")
      .replace(/<output>/g, "<h3>用例输出</h3><pre>")
      .replace(/<\/output>/g, "</pre><br/>");
    finalExamples = decodeHTMLToMarkdown(finalExamples, baseUrl);

    const finalDescription = decodeHTMLToMarkdown(description, baseUrl);

    let finalInput = input.replaceAll(/</g, "&lt;").replaceAll(/>/g, "&gt;");
    finalInput = finalInput.replaceAll("\n", "<br/>");
    console.log(finalInput);
    finalInput = decodeHTMLToMarkdown(finalInput, baseUrl);

    let finalOutput = output.replaceAll(/</g, "&lt;").replaceAll(/>/g, "&gt;");
    finalOutput = finalOutput.replaceAll("\n", "<br/>");
    finalOutput = decodeHTMLToMarkdown(finalOutput, baseUrl);

    const finalHint = decodeHTMLToMarkdown(hint, baseUrl);
    const finalAuthor = decodeHTMLToMarkdown(author, baseUrl);
    const finalSource = decodeHTMLToMarkdown(source, baseUrl);

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
            title: decodeHTMLToMarkdown(title, baseUrl),
            timeLimit: finalTimeLimit,
            memoryLimit: finalMemoryLimit,
            description: finalDescription,
            input: finalInput,
            output: finalOutput,
            examples: finalExamples,
            hint: finalHint ? "\n\n## 提示\n\n" + finalHint : "",
            author: finalAuthor ? "\n\n## 作者\n\n" + finalAuthor : "",
            source: finalSource ? "\n\n## 来源\n\n" + finalSource : "",
          }),
        },
      ],
    };
  }
}
