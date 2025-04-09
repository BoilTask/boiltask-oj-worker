import { getRemoteMarkdown } from "crawler/nyoj";

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

    const assetUrl = new URL("/template/nyoj.md", request.url);
    const templateResp = await env.ASSETS.fetch(assetUrl);
    const templateText = await templateResp.text();
    const { title, markdown } = await getRemoteMarkdown(
      targetProblem,
      templateText
    );

    // 3. Upload to GitHub via API
    const GITHUB_TOKEN = env.GITHUB_TOKEN;

    const REPO_OWNER = "BoilTask";
    const REPO_NAME = "boiltask-oj";
    const FILE_PATH = `content/problem/${targetOj}/${targetProblem}/index.md`; // 文件路径
    const COMMIT_MESSAGE = `add problem ${targetOj}-${targetProblem} ${title}`;

    const fileMetadataRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: "GET",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "User-Agent": "Cloudflare-Worker",
        },
      }
    );
    const fileMetadata = await fileMetadataRes.json();
    const fileSha = fileMetadata.sha; // 获取 SHA 值

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
          sha: fileSha, // 提供当前文件的 SHA 值
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
