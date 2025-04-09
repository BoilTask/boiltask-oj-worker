import TurndownService from "turndown";
import { createDocument } from "@mixmark-io/domino";
const turndownService = new TurndownService({
  hr: "---",
});

const getOjTitle = (oj: string): string => {
  switch (oj) {
    case "nyoj":
      return "NYOJ";
    default:
      return oj.toUpperCase();
  }
};

function render(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

function decodeHTML(html: string): string {
  return turndownService.turndown(createDocument(html));
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const { searchParams } = new URL(request.url);
    const targetOj = searchParams.get("oj");
    if (!targetOj) {
      return new Response("Missing 'oj' parameter", { status: 400 });
    }
    const targetProblem = searchParams.get("problem");
    if (!targetProblem) {
      return new Response("Missing 'problem' parameter", { status: 400 });
    }
    if (targetOj !== "nyoj") {
      return new Response("Unsupported OJ", { status: 400 });
    }

    const targetUrl =
      "https://xcpc.nyist.edu.cn/api/get-problem-detail?problemId=" +
      targetProblem;

    // 1. Fetch JSON data
    const res = await fetch(targetUrl);
    const json = await res.json();

    if (!json?.data?.problem) {
      return new Response("Invalid problem format", { status: 500 });
    }

    const assetUrl = new URL("/template/nyoj.md", request.url);
    const templateResp = await env.ASSETS.fetch(assetUrl);
    const templateText = await templateResp.text();

    const { title, description, input, output, examples, source, hint } =
      json.data.problem;

    const markdown = render(templateText, {
      oj: targetOj,
      problem: targetProblem,
      oj_title: getOjTitle(targetOj),
      title: decodeHTML(title),
      description: decodeHTML(description),
      input: decodeHTML(input),
      output: decodeHTML(output),
      examples: decodeHTML(examples),
      source: decodeHTML(source),
      hint: decodeHTML(hint) || "无",
    });

    // 3. Upload to GitHub via API
    const GITHUB_TOKEN = env.GITHUB_TOKEN;

    const REPO_OWNER = "BoilTask";
    const REPO_NAME = "boiltask-oj";
    const FILE_PATH = `content/problem/${targetOj}/${targetProblem}/index.md`; // 文件路径
    const COMMIT_MESSAGE = `add problem ${targetOj}-${targetProblem} ${title}`;

    const uploadRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "Cloudflare-Worker",
        },
        body: JSON.stringify({
          message: COMMIT_MESSAGE,
          content: btoa(unescape(encodeURIComponent(markdown))), // base64 编码
        }),
      }
    );

    const uploadResult = await uploadRes.json();

    return new Response(
      JSON.stringify({ ok: true, upload: uploadResult }, null, 2),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};
