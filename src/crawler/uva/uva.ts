import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import { render } from "render";

export class UvaCrawler extends Crawler {
  getName() {
    return "uva";
  }

  async fetchContent(request: Request, env: Env, problemId: string): Promise<CrawlerResponse> {
    const baseUrl = "https://uva.onlinejudge.org/";

    const vjudgeUrl = `https://vjudge.net/problem/UVA-${problemId}/origin`;
    const res = await fetch(vjudgeUrl, {
      method: "GET",
      redirect: "manual",
    });
    const uvaUrl = res.headers.get("location");
    const uvaRes = await fetch(uvaUrl);
    const buffer = await uvaRes.arrayBuffer();
    const decoder = new TextDecoder("utf-8");
    const html = decoder.decode(buffer);
    const titleRegex = `<h3>${problemId} - ([\\s\\S]+)</h3>`;
    const titleMatch = html.match(new RegExp(titleRegex));

    const limitMatch = html.match(/Time limit: (\S+? seconds)/);

    const title = titleMatch[1];
    const timeLimit = limitMatch[1]; // 同上
    const memoryLimit = null; // 同上

    const pdfUrl = html.match(/<a href="(external\/\S+)">/);
    const downloadUrl = baseUrl + pdfUrl;
    const pdfResponse = await fetch(downloadUrl);
    const fileBuffer = await pdfResponse.arrayBuffer();
    const contentType = pdfResponse.headers.get("content-type") || "application/octet-stream";
    const fileName = downloadUrl.split("/").pop();
    const r2Response = await env.BOILTASK_OJ_BUCKET.put(fileName, fileBuffer, {
      httpMetadata: {
        contentType,
      },
    });

    console.log(r2Response);


    // 计算pdf的链接
    const view = uvaUrl;

    const templateText = await this.getTemplateText(request, env);

    return {
      code: 0,
      title,
      github_contents: [
        {
          path: `content/problem/uva/${problemId}/index.md`,
          content: render(templateText, {
            oj: "uva",
            problem: problemId,
            oj_title: "UVa",
            title: title,
            timeLimit: timeLimit,
            memoryLimit: memoryLimit,
            url: view,
            link: uvaUrl,
          }),
        },
      ],
    };
  }
}
