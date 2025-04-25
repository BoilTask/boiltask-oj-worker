export async function deleteR2Prefix(env: Env, prefix: string): Promise<void> {
  const list = await env.BOILTASK_OJ_BUCKET.list({ prefix });
  for (const obj of list.objects) {
    await env.BOILTASK_OJ_BUCKET.delete(obj.key);
  }
}
