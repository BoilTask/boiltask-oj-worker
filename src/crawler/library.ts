import { NyojCrawler } from "./nyoj/nyoj";
import type { Crawler } from "./crawler";
import { HduCrawler } from "./hdu/hdu";
import { ZzuliCrawler } from "./zzuli/zzuli";

const spiderRegistry = {
  nyoj: NyojCrawler,
  hdu: HduCrawler,
  zzuli: ZzuliCrawler,
};

export function GetOjCrawler(oj: string): Crawler {
  const spider = spiderRegistry[oj];
  if (!spider) {
    return null;
  }
  return new spider();
}
