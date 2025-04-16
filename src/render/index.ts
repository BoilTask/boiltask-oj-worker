import { createDocument } from "@mixmark-io/domino";
import TurndownService from "turndown";

const turndownService = new TurndownService({
  hr: "---",
  input: "```"
});

export function render(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

export function decodeHTML(html: string): string {
  return turndownService.turndown(createDocument(html));
}

function extractImageUrls(markdown: string): string[] {
  const regex = /!\[.*?\]\((https?:\/\/.*?)\)/g;
  const urls = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}
