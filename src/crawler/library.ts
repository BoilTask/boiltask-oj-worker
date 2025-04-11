import { NyojCrawler } from "./nyoj/nyoj";
import type { Crawler } from "./crawler";

const spiderRegistry = {
  nyoj: NyojCrawler,
};

export function GetOjCrawler(oj: string): Crawler {
  const spider = spiderRegistry[oj];
  if (!spider) {
    return null;
  }
  return new spider();
}
