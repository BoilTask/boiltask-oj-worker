import { getRemoteMarkdown } from "crawler/nyoj";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.method === "OPTIONS") {
      // 处理预检请求，允许跨域请求
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*", // 允许所有来源，或者修改为特定域名
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 确保请求是 POST 方法
    if (request.method !== "POST") {
      return new Response("Only POST method is allowed", { status: 405 });
    }

    // 尝试从请求体解析 JSON 数据
    let requestBody;
    try {
      requestBody = await request.json(); // 解析 JSON 数据
    } catch (err) {
      return new Response("Invalid JSON format", { status: 400 });
    }

    // 从请求体中解构出 oj 和 problem 参数
    const { oj, problem } = requestBody;

    // 检查参数是否存在
    if (!oj) {
      return new Response("Missing 'oj' parameter", { status: 400 });
    }
    if (!problem) {
      return new Response("Missing 'problem' parameter", { status: 400 });
    }

    // 检查 OJ 是否是支持的
    if (oj !== "nyoj") {
      return new Response("Unsupported OJ", { status: 400 });
    }

    // 获取模板文件内容
    const assetUrl = new URL("/template/nyoj.md", request.url);
    const templateResp = await env.ASSETS.fetch(assetUrl);
    const templateText = await templateResp.text();

    // 使用 crawler 获取远程问题的 Markdown 内容
    const { title, markdown } = await getRemoteMarkdown(problem, templateText);

    // GitHub 上传设置
    const GITHUB_TOKEN = env.GITHUB_TOKEN;

    const REPO_OWNER = "BoilTask";
    const REPO_NAME = "boiltask-oj";
    const FILE_PATH = `content/problem/${oj}/${problem}/index.md`; // 文件路径
    const COMMIT_MESSAGE = `add problem ${oj}-${problem} ${title}`;

    // 获取文件的 SHA 值
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
    const fileSha = fileMetadata.sha; // 获取文件的 SHA 值

    // 上传更新的文件到 GitHub
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

    // 返回成功响应
    return new Response(
      JSON.stringify({ ok: true, upload: uploadResult }, null, 2),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // 允许所有来源，或者修改为特定域名
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  },
};
