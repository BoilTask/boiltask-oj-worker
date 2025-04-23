import { NyojCrawler } from "./nyoj/nyoj";
import type { Crawler } from "./crawler";
import { HduCrawler } from "./hdu/hdu";
import { ZzuliCrawler } from "./zzuli/zzuli";
import { LightojCrawler } from "./lightoj/lightoj";
import { UvaCrawler } from "./uva/uva";

const spiderRegistry = {
  nyoj: NyojCrawler,
  hdu: HduCrawler,
  zzuli: ZzuliCrawler,
  lightoj: LightojCrawler,
  uva: UvaCrawler,
};

export function GetOjCrawler(oj: string): Crawler {
  const spider = spiderRegistry[oj];
  if (!spider) {
    return null;
  }
  return new spider();
}
