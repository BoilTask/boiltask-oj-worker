import { decodeHTMLToMarkdown, render } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import { ErrorCode } from "../../error/code";

export class ZojCrawler extends Crawler {
  getName() {
    return "zoj";
  }

  async fetchContent(request: Request, env: Env, problemId: string): Promise<CrawlerResponse> {
    const problemKey = `${this.getName()}-${problemId}`;
    const vjudgeUrl = `https://vjudge.net/problem/ZOJ-${problemId}/origin`;
    const vjudgeRes = await fetch(vjudgeUrl, {
      method: "GET",
      redirect: "manual",
    });
    if (vjudgeRes.status !== 303) {
      return {
        code: ErrorCode.OjError,
        data: "Failed to fetch problem page",
      };
    }
    const url = vjudgeRes.headers.get("location");

    let apiUrlRegex = /\S+problem-sets\/(\d+)\/problems\/(\d+)/;
    let apiUrlMatch = url.match(apiUrlRegex);
    if (!apiUrlMatch) {
      apiUrlRegex = /\S+problem-sets\/(\d+)\/exam\/problems\/type\/\d+\?problemSetProblemId=(\d+)/;
      apiUrlMatch = url.match(apiUrlRegex);
      if (!apiUrlMatch) {
        throw new Error("Failed to parse API URL from vjudge response");
      }
    }
    const ptaProblemSetId = apiUrlMatch[1];
    const ptaProblemId = apiUrlMatch[2];
    const apiUrl = `https://pintia.cn/api/problem-sets/${ptaProblemSetId}/exam-problems/${ptaProblemId}`;

    const problemJsonResponse = await fetch(apiUrl, {
      headers: {
        accept: "application/json;charset=UTF-8",
        "accept-language": "zh-CN",
        "content-type": "application/json;charset=UTF-8",
        priority: "u=1, i",
        "sec-ch-ua": '"Microsoft Edge";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-lollipop": "e16a3b81c2c986429f6a18cd629f6725",
        "x-marshmallow": "",
        cookie:
          "PTASession=9e67caa8-608d-428f-92c5-2d621acb8ebe; _bl_uid=UamsO9U2weshpbpz876R11kwqF4m; _ga=GA1.1.721085732.1745567310; _ga_ZHCNP8KECW=GS1.1.1745567309.1.1.1745568427.60.0.0; JSESSIONID=2E8256C89E266456BC16D17D54805FBE",
        Referer: "https://pintia.cn/problem-sets/91827364500/exam/problems/type/7?problemSetProblemId=91827364523&page=0",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: null,
      method: "GET",
    });
    if (problemJsonResponse.status !== 200) {
      return {
        code: ErrorCode.OjError,
        data: "Failed to fetch problem page",
      };
    }

    const problemJsonData = (await problemJsonResponse.json()) as any;

    const problemData = problemJsonData.problemSetProblem;

    const title = problemData.title;

    const baseUrl = "https://pintia.cn/";

    const description = await decodeHTMLToMarkdown(env, problemKey, problemData.description, baseUrl);

    const author = problemData.author;

    const programmingProblemConfig = problemData.problemConfig.programmingProblemConfig;

    const timeLimit = programmingProblemConfig.timeLimit + " ms";
    const memoryLimit = programmingProblemConfig.memoryLimit + " KB";

    const templateText = await this.getTemplateText(request, env);

    return {
      code: 0,
      title: title,
      github_contents: [
        {
          path: `content/problem/zoj/${problemId}/index.md`,
          content: render(templateText, {
            oj: "zoj",
            problem: problemId,
            oj_title: "ZOJ",
            title: title,
            timeLimit: timeLimit,
            memoryLimit: memoryLimit,
            description: description,
            author: author,
          }),
        },
      ],
    };
  }
}
