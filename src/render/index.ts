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
  // 处理 href="/xxx"
  html = html.replace(/(href)=["'](\/[^"']*)["']/gi, (_, attr, path) => {
    return `${attr}="${baseUrl}${path}"`;
  });

  // 处理 src="/xxx"
  html = html.replace(/(src)=["'](\/[^"']*)["']/gi, (_, attr, path) => {
    return `${attr}="${baseUrl}${path}"`;
  });

  return html;
}

export function decodeHTMLToMarkdown(html: string, baseUrl: string): string {
  html = fixRelativeLinks(html, baseUrl);
  return turndownService.turndown(createDocument(html));
}
