import { createDocument } from "@mixmark-io/domino";
import TurndownService from "turndown";

const turndownService = new TurndownService({
  hr: "---",
});

export function render(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

export function decodeHTML(html: string): string {
  return turndownService.turndown(createDocument(html));
}
