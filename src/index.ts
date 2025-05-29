import { NewResponse, NewResponseMeta } from "./response/library";
import { MetaRequest } from "./request/define";
import { ErrorCode } from "./error/code";
import { GetOjCrawler } from "./crawler/library";
import { commitFilesToGitHub } from "./library/github";
import { deleteR2Prefix } from "./r2";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return NewResponseMeta(null);
    }

    // 确保请求是 POST 方法
    if (request.method !== "POST") {
      return NewResponse(ErrorCode.MethodError, "Only POST method is allowed");
    }

    try {
      // 尝试从请求体解析 JSON 数据
      // 从请求体中解构出 oj 和 problem 参数
      const { oj, problem } = (await request.json()) as MetaRequest;

      // 检查参数是否存在
      if (!oj) {
        return NewResponse(ErrorCode.ParamNotFound, "Missing 'oj' parameter");
      }
      if (!problem) {
        return NewResponse(ErrorCode.ParamNotFound, "Missing 'problem' parameter");
      }

      const ojCrawler = GetOjCrawler(oj);
      if (!ojCrawler) {
        return NewResponse(ErrorCode.OjNotSupport, "Unsupported OJ");
      }
      const problemKey = `${oj}-${problem}`;
      await deleteR2Prefix(env, problemKey);
      const responseContent = await ojCrawler.fetchContent(request, env, problem);
      if (responseContent.code !== ErrorCode.Success) {
        return NewResponse(responseContent.code, responseContent.data);
      }

      // GitHub 上传设置
      const GITHUB_TOKEN = env.GITHUB_TOKEN;
      const REPO_OWNER = "BoilTask";
      const REPO_NAME = "boiltask-oj";
      const COMMIT_MESSAGE = `add problem ${oj}-${problem} ${responseContent.title}`;

      const uploadResult = await commitFilesToGitHub(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, "main", responseContent.github_contents, COMMIT_MESSAGE);

      return NewResponse(ErrorCode.Success, uploadResult);
    } catch (err) {
      console.log(err);
      return NewResponse(ErrorCode.CommonError, err);
    }
  },
};
