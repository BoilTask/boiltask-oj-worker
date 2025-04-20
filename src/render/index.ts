// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { createDocument } from "@mixmark-io/domino";
import TurndownService from "turndown";

const turndownService = new TurndownService({
  hr: "---",
  input: "```",
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
