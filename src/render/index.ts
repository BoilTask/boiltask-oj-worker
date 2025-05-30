// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { createDocument } from "@mixmark-io/domino";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import crypto from "crypto";

export function render(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

export async function fixAndUploadAllLinks(env: Env, problemKey: string, html: string, baseUrl: string): Promise<string> {
  const isAbsoluteUrl = (path: string): boolean => /^https?:\/\//i.test(path);

  type Replacement = {
    start: number;
    end: number;
    replacement: string;
    forceUpload: boolean;
  };

  const replacements: Replacement[] = [];

  const collectLinks = (pattern: RegExp, forceUpload: bool) => {
    if (!html) {
      return;
    }
    html.replace(pattern, (match, ...args) => {
      const offset = args[args.length - 2]; // match offset 是倒数第二个参数
      replacements.push({
        start: offset,
        end: offset + match.length,
        replacement: "",
        forceUpload: forceUpload,
      });
      return match;
    });
  };

  collectLinks(/src=["']([^"']+)["']/gi, true);
  collectLinks(/!\[([^\]]*)\]\(([^)]+)\)/g, true);
  collectLinks(/href=["']([^"']+)["']/gi, false);

  await Promise.all(
    replacements.map(async (entry) => {
      const raw = html.slice(entry.start, entry.end);
      const pathMatch = /["']([^"']+)["']/.exec(raw) || /\(([^)]+)\)/.exec(raw);
      if (!pathMatch) return;
      const originalPath = pathMatch[1];
      const absoluteUrl = isAbsoluteUrl(originalPath) ? originalPath : baseUrl + originalPath;
      let newUrl;
      if (!entry.forceUpload && !absoluteUrl.match(/\.(png|jpe?g|gif|webp)$/i)) {
        newUrl = absoluteUrl;
      } else {
        const res = await fetch(absoluteUrl);
        const buffer = await res.arrayBuffer();
        const hash = await crypto.subtle.digest("MD5", buffer);
        const hashHex = Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const r2Key = `${problemKey}/${hashHex}`;
        await env.BOILTASK_OJ_BUCKET.put(r2Key, buffer);
        newUrl = `https://r2-oj.boiltask.com/${r2Key}`;
      }

      if (/^(src|href)=/.test(raw)) {
        const attr = raw.split("=")[0];
        entry.replacement = `${attr}="${newUrl}"`;
      } else {
        const alt = /\[([^\]]*)\]/.exec(raw)?.[1] ?? "";
        entry.replacement = `![${alt}](${newUrl})`;
      }
    })
  );

  // 按顺序合并替换结果
  replacements.sort((a, b) => a.start - b.start);
  let result = "";
  let lastIndex = 0;

  for (const r of replacements) {
    result += html.slice(lastIndex, r.start) + r.replacement;
    lastIndex = r.end;
  }
  if (html) {
    result += html.slice(lastIndex); // append剩下的部分
  }

  return result;
}

const turndownService = new TurndownService({
  hr: "---",
});

turndownService.use(gfm);

// 如果有center，保留这个标签，并且内部也不转换markdown了，因为兼容性较差
turndownService.addRule("center", {
  filter: (node) => {
    return node.nodeName.toLowerCase() === "center";
  },
  replacement: function (content, node) {
    return '<div style="text-align: center;">' + node.innerHTML + "</div>";
  },
});

// 如果存在b标签，则标签内的所有的html标签都不转义了
turndownService.addRule("ignoreHtml", {
  filter: (node) => {
    return node.nodeName.toLowerCase() === "b";
  },
  replacement: function (content, node) {
    return "**" + node.innerHTML + "**";
  },
});

// 自定义规则，把 <em> 和 <i> 转为 *斜体*
turndownService.addRule("emphasisWithAsterisk", {
  filter: ["em", "i"],
  replacement: function (content) {
    return "*" + content + "*";
  },
});

turndownService.addRule("texSpanToMath", {
  filter: (node) => {
    return node.nodeName.toLowerCase() === "span" && node.classList.contains("tex-span");
  },
  replacement: (content, node) => {
    // 去除所有 <i> 标签
    const iTags = node.querySelectorAll("i");
    for (let i = 0; i < iTags.length; i++) {
      const tag = iTags[i];
      const parent = tag.parentNode;
      if (parent) {
        while (tag.firstChild) {
          parent.insertBefore(tag.firstChild, tag);
        }
        parent.removeChild(tag);
      }
    }
    content = node.textContent;
    const subs = node.querySelectorAll("sub");
    for (let i = 0; i < subs.length; i++) {
      const subText = subs[i].textContent;
      // 替换所有相同 sub 内容
      content = content.replace(subText, `_{${subText}}`);
    }

    const sups = node.querySelectorAll("sup");
    for (let i = 0; i < sups.length; i++) {
      const supText = sups[i].textContent;
      // 替换所有相同 sup 内容
      content = content.replace(supText, `^{${supText}}`);
    }

    return `$${content}$`;
  },
});

turndownService.addRule("preWithCodeAndLang", {
  filter: (node) => {
    return node.nodeName.toLowerCase() === "pre";
  },
  replacement: function (_content, node) {
    let codeNode = node.firstChild as HTMLElement;
    if (!codeNode || !codeNode.getAttribute) {
      codeNode = node as HTMLElement;
    }

    const className = codeNode.getAttribute("class") || "";
    const match = className.match(/(?:language|lang)-([a-z0-9]+)/i);
    const language = match ? match[1].toLowerCase() : "";

    // 手动将 <br> 转换为换行符
    let html = (codeNode as any).innerHTML || "";
    html = html.replace(/<br\s*\/?>/gi, "\n");

    // 去除其余的 HTML 标签，仅保留文本（可选，如果你确认内容就是纯文本可以省略）
    const strippedText = html.replace(/<\/?[^>]+(>|$)/g, "");

    return `\n\`\`\`${language}\n${strippedText}\n\`\`\`\n`;
  },
});

export async function decodeHTMLToMarkdown(env: Env, problem: string, html: string, baseUrl: string): Promise<string> {
  html = await fixAndUploadAllLinks(env, problem, html, baseUrl);
  return turndownService.turndown(createDocument(html));
}
