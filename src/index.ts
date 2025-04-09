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
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 确保请求是 POST 方法
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ code: 1000, data: "Only POST method is allowed" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

    // 尝试从请求体解析 JSON 数据
    let requestBody;
    try {
      requestBody = await request.json(); // 解析 JSON 数据
    } catch (err) {
      return new Response(
        JSON.stringify({ code: 1000, data: "Invalid JSON format" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

    // 从请求体中解构出 oj 和 problem 参数
    const { oj, problem } = requestBody;

    // 检查参数是否存在
    if (!oj) {
      return new Response(
        JSON.stringify({ code: 1000, data: "Missing 'oj' parameter" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }
    if (!problem) {
      return new Response(
        JSON.stringify({ code: 1000, data: "Missing 'problem' parameter" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

    // 检查 OJ 是否是支持的
    if (oj !== "nyoj") {
      return new Response(
        JSON.stringify({ code: 1000, data: "Unsupported OJ" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
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

    // 获取文件的 SHA 值和内容
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

    let uploadResult = null;

    // 检查文件是否存在，若不存在，则需要创建文件
    if (fileMetadata.message === "Not Found") {
      // 文件不存在，直接上传
      uploadResult = await uploadFileToGitHub(markdown, null);
    } else {
      const existingFileSha = fileMetadata.sha; // 获取文件的 SHA 值
      const existingFileContent = decodeBase64(fileMetadata.content); // 解码现有的文件内容

      // 如果内容相同，则不需要上传
      if (existingFileContent !== markdown) {
        // 内容不同，上传更新的文件
        uploadResult = await uploadFileToGitHub(markdown, existingFileSha);
      } else {
        console.log("文件内容相同，跳过提交");
      }
    }

    // 上传文件的函数
    async function uploadFileToGitHub(content, sha) {
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
            content: btoa(unescape(encodeURIComponent(content))), // base64 编码
            sha: sha, // 提供当前文件的 SHA 值，如果存在
          }),
        }
      );

      return await uploadRes.json();
    }

    // 解码 base64 编码内容
    function decodeBase64(base64Content) {
      return decodeURIComponent(escape(atob(base64Content)));
    }

    return new Response(JSON.stringify({ code: 0, data: uploadResult }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  },
};
