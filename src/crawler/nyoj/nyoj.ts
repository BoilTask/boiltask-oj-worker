import { render, decodeHTMLToMarkdown, fixAndUploadAllLinks } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import { ErrorCode } from "../../error/code";
import * as cheerio from "cheerio";

export class NyojCrawler extends Crawler {
  getName() {
    return "nyoj";
  }

  async fetchContent(request: Request, env: Env, problemId: string): Promise<CrawlerResponse> {
    const problemKey = `${this.getName()}-${problemId}`;
    const acmFlag = "acm-";
    if (problemId.startsWith(acmFlag)) {
      const acmProblem = problemId.substring(acmFlag.length);
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
      if (resJson.status !== 200) {
        return {
          code: ErrorCode.OjError,
          data: "Failed to fetch problem page",
        };
      }
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

      const finalContent = await fixAndUploadAllLinks(env, problemKey, content, baseUrl);

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
            path: `content/problem/nyoj/${problemId}/index.md`,
            content: render(templateText, {
              oj: "nyoj",
              problem: problemId,
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

    const targetUrl = `${baseUrl}api/get-problem-detail?problemId=` + problemId;
    const res = await fetch(targetUrl);
    if (res.status !== 200) {
      return {
        code: ErrorCode.OjError,
        data: "Failed to fetch problem page",
      };
    }
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
    finalExamples = await decodeHTMLToMarkdown(env, problemKey, finalExamples, baseUrl);

    const finalDescription = await decodeHTMLToMarkdown(env, problemKey, description, baseUrl);

    let finalInput = input.replaceAll(/</g, "&lt;").replaceAll(/>/g, "&gt;");
    finalInput = finalInput.replaceAll("\n", "<br/>");
    finalInput = await decodeHTMLToMarkdown(env, problemKey, finalInput, baseUrl);

    let finalOutput = output.replaceAll(/</g, "&lt;").replaceAll(/>/g, "&gt;");
    finalOutput = finalOutput.replaceAll("\n", "<br/>");
    finalOutput = await decodeHTMLToMarkdown(env, problemKey, finalOutput, baseUrl);

    const finalHint = await decodeHTMLToMarkdown(env, problemKey, hint, baseUrl);
    const finalAuthor = await decodeHTMLToMarkdown(env, problemKey, author, baseUrl);
    const finalSource = await decodeHTMLToMarkdown(env, problemKey, source, baseUrl);

    const templateText = await this.getTemplateText(request, env);
    return {
      code: 0,
      title: title,
      github_contents: [
        {
          path: `content/problem/nyoj/${problemId}/index.md`,
          content: render(templateText, {
            oj: "nyoj",
            problem: problemId,
            oj_title: "NYOJ",
            title: await decodeHTMLToMarkdown(env, problemKey, title, baseUrl),
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
