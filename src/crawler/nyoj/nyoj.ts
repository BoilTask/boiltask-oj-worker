import { render, decodeHTMLToMarkdown } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import { ErrorCode } from "../../error/code";

export class NyojCrawler extends Crawler {
  getName() {
    return "nyoj";
  }

  decodeExamples(example: string): string {
    // "examples": "\u003Cinput\u003E1\n5\namMac\u003C/input\u003E\u003Coutput\u003E0\u003C/output\u003E\u003Cinput\u003E1\n5\nACMAM\u003C/input\u003E\u003Coutput\u003E1\u003C/output\u003E",
    // 使用```包括每一个input与output
    // ### 示例1
    // #### 输入
    // ```
    // 1
    // ```
    // #### 输出
    // ```
    // 0
    // ```
    // ### 示例2
    // ……

    // example = decodeHTMLToMarkdown(example)
    // const inputRegex = /<input>(.*?)<\/input>/g;
    // const outputRegex = /<output>(.*?)<\/output>/g;
    // const inputs = [
    //   ...example.matchAll(inputRegex),
    // ].map((match) => match[1]);
    // const outputs = [
    //  ...example.matchAll(outputRegex),
    // ].map((match) => match[1]
    //   );
    // let result = ""
    // for (let i = 0; i < inputs.length; i++) {
    //   result += `### 示例${i + 1}\n`
    //   result += `#### 输入\n`
    //   result += `\`\`\`\n
    //   ${inputs[i]}
    //   \`\`\`\n`
    //   result += `#### 输出\n`
    //   result += `\`\`\`\n
    //   ${outputs[i]}
    //   \`\`\`\n`
    //   result += `\n`
    // }
    // return result

    return example;
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
            examples: this.decodeExamples(examples),
            source: decodeHTMLToMarkdown(source, baseUrl),
            hint: decodeHTMLToMarkdown(hint, baseUrl) || "无",
          }),
        },
      ],
    };
  }
}
