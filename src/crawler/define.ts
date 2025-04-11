import type { GithubContent } from "library/github";

export interface CrawlerResponse {
  code: number; // 响应码
  data?: any; // 响应数据
  title?: string; // 题目标题
  github_contents?: GithubContent[]; // 所需上传的内容
}
