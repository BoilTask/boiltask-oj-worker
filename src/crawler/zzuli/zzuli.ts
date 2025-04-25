import { render, decodeHTMLToMarkdown } from "render";
import { CrawlerResponse } from "../define";
import { Crawler } from "../crawler";
import * as cheerio from "cheerio";

export class ZzuliCrawler extends Crawler {
  getName() {
    return "zzuli";
  }

  async fetchContent(request: Request, env: Env, problemId: string): Promise<CrawlerResponse> {
    const problemKey = `${this.getName()}-${problemId}`;
    const baseUrl = "https://web.archive.org/web/http://acm.zzuli.edu.cn/";
    const url = `${baseUrl}problem.php?id=${problemId}`;
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    // archive.org 页面通常转为 UTF-8
    const decoder = new TextDecoder("utf-8");
    const html = decoder.decode(buffer);

    const $ = cheerio.load(html);

    // 题目标题：如 "1001: A + B Problem" -> "A + B Problem"
    const title = $("h3")
      .first()
      .text()
      .replace(/^\d+:\s*/, "")
      .trim();

    // 提取时间与内存限制
    const centerText = $("center").first().text();
    const timeLimitMatch = centerText.match(/时间限制:\s*(\d+)/);
    const memoryLimitMatch = centerText.match(/内存限制:\s*(\d+)/);

    const timeLimit = (timeLimitMatch ? timeLimitMatch[1] : "?") + " Sec";
    const memoryLimit = (memoryLimitMatch ? memoryLimitMatch[1] : "?") + " MB";

    const contentMap: Record<string, string> = {};
    let currentSection = "";

    const panels = $(".panel.panel-default");
    const promises = panels.map(async (_, el) => {
      const heading = $(el).find(".panel-heading").first().text().trim();
      const content = $(el).find(".panel-body.content").first().html()?.trim() || "";
      if (heading && content) {
        currentSection = heading.replace(/[\s:：]/g, "").toLowerCase(); // 标准化 key
        contentMap[currentSection] = await decodeHTMLToMarkdown(env, problemKey, content, baseUrl);
      }
    });
    await Promise.all(promises);

    // 特别处理样例输入输出（因为它们是 <span id="sampleinput"> 而不是一般结构）
    const rawSampleInput = $("#sampleinput").html().trim();
    const rawSampleOutput = $("#sampleoutput").html().trim();

    const templateText = await this.getTemplateText(request, env);

    return {
      code: 0,
      title,
      github_contents: [
        {
          path: `content/problem/zzuli/${problemId}/index.md`,
          content: render(templateText, {
            oj: "zzuli",
            problem: problemId,
            oj_title: "ZZULI",
            title: title,
            timeLimit: timeLimit,
            memoryLimit: memoryLimit,
            description: contentMap["题目描述"] || "",
            input: contentMap["输入"] || "",
            output: contentMap["输出"] || "",
            sampleInput: rawSampleInput || "",
            sampleOutput: rawSampleOutput || "",
            hint: contentMap["提示"] ? `\n\n## 提示\n\n${contentMap["提示"]}` : "",
            author: contentMap["作者"] ? `\n\n## 作者\n\n${contentMap["作者"]}` : "",
            source: contentMap["来源/分类"] ? `\n\n## 来源/分类\n\n${contentMap["来源/分类"]}` : "",
          }),
        },
      ],
    };
  }
}
