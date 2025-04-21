// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { createDocument } from "@mixmark-io/domino";
import TurndownService from "turndown";

const turndownService = new TurndownService({
  hr: "---",
});

turndownService.addRule('inputToCodeBlock', {
  filter: ['input'],
  replacement: function (content) {
    return `\`\`\`\n${content}\n\`\`\``;
  }
});

turndownService.addRule('outputToCodeBlock', {
  filter: ['output'],
  replacement: function (content) {
    return `\`\`\`\n${content}\n\`\`\``;
  }
});

turndownService.addRule('preWithCodeAndLang', {
  filter: (node) => {
    return (
      node.localName.toLowerCase() === 'pre'
    );
  },
  replacement: function (_content, node) {
    const codeNode = node.firstChild as HTMLElement;
    const className = codeNode.getAttribute('class') || '';

    // 提取语言名，忽略大小写，统一为小写
    const match = className.match(/(?:language|lang)-([a-z0-9]+)/i);
    const language = match ? match[1].toLowerCase() : '';

    const code = codeNode.textContent || '';
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }
});

export function render(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

export function fixRelativeLinks(html: string, baseUrl: string): string {
  // 通用处理函数，判断是否以 http(s) 开头
  const replacer = (attr: string, path: string): string => {
    if (/^https?:\/\//i.test(path)) {
      return `${attr}="${path}"`;
    }
    return `${attr}="${baseUrl}${path}"`;
  };
  // 处理 href
  html = html.replace(/(href)=["']([^"']+)["']/gi, (_, attr, path) => replacer(attr, path));
  // 处理 src
  html = html.replace(/(src)=["']([^"']+)["']/gi, (_, attr, path) => replacer(attr, path));
  return html;
}

export function decodeHTMLToMarkdown(html: string, baseUrl: string): string {
  html = fixRelativeLinks(html, baseUrl);
  return turndownService.turndown(createDocument(html));
}
