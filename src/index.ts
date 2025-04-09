import TurndownService from "turndown";
import { createDocument } from "@mixmark-io/domino";
const turndownService = new TurndownService();

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

    return new Response(markdown);
  },
};
