import { Octokit } from "octokit";

export interface GithubContent {
  path: string; // 目标的相对路径
  content: string; // 所上传的文件内容（明文字符串，建议为 UTF-8 编码）
}

export async function commitFilesToGitHub(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: GithubContent[],
  commitMessage: string
): Promise<unknown> {
  const octokit = new Octokit({ auth: token });

  // Step 1: 获取目标分支的最新 commit
  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  const latestCommitSha = refData.object.sha;
  // Step 2: 获取该 commit 的 tree（文件树）SHA
  const { data: commitData } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = commitData.tree.sha;

  console.log(baseTreeSha);

  // Step 3: 为每个文件创建 blob（保存内容）
  const blobResults = await Promise.all(
    files.map((file) =>
      octokit.rest.git.createBlob({
        owner,
        repo,
        content: file.content,
        encoding: "utf-8",
      })
    )
  );

  // Step 4: 构造 tree 的内容
  const tree = files.map((file, idx) => ({
    path: file.path,
    mode: "100644", // 普通文件
    type: "blob",
    sha: blobResults[idx].data.sha,
  }));

  // Step 5: 创建新的 tree
  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree,
  });

  // Step 6: 创建新的 commit
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  // Step 7: 更新分支指向新 commit
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  console.log(`✅ 成功提交 ${files.length} 个文件到 ${owner}/${repo}@${branch}`);

  return {
    owner: owner,
    repo: repo,
    branch: branch,
    files: files.map((file) => file.path),
  };
}
