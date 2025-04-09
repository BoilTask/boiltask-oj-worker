import { render, decodeHTML } from "render";

export async function getRemoteMarkdown(
  targetProblem: string,
  templateText: string
) {
  const targetUrl =
    "https://xcpc.nyist.edu.cn/api/get-problem-detail?problemId=" +
    targetProblem;

  // 1. Fetch JSON data
  const res = await fetch(targetUrl);
  const json = await res.json();

  if (!json?.data?.problem) {
    return new Response("Invalid problem format", { status: 500 });
  }

  const { title, description, input, output, examples, source, hint } =
    json.data.problem;

  return {
    title: title,
    markdown: render(templateText, {
      oj: "nyoj",
      problem: targetProblem,
      oj_title: "NYOJ",
      title: decodeHTML(title),
      description: decodeHTML(description),
      input: decodeHTML(input),
      output: decodeHTML(output),
      examples: decodeHTML(examples),
      source: decodeHTML(source),
      hint: decodeHTML(hint) || "无",
    }),
  };
}
