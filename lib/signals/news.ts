import { XMLParser } from "fast-xml-parser";
import type { Asset, Source } from "../types";
import { getText } from "./http";

const parser = new XMLParser({ ignoreAttributes: false });

export async function fetchNews(a: Asset, limit = 5): Promise<Source[]> {
  const q = encodeURIComponent(`${a.newsQuery} when:2d`);
  const xml = await getText(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`);
  const doc = parser.parse(xml);
  let items = doc?.rss?.channel?.item ?? [];
  if (!Array.isArray(items)) items = [items];
  return (items as Record<string, unknown>[]).slice(0, limit).map((it, i) => {
    const src = it.source as { "#text"?: string } | string | undefined;
    const outlet = (typeof src === "string" ? src : src?.["#text"]) ?? "Unknown";
    let title = String(it.title ?? "");
    const suffix = ` - ${outlet}`;
    if (title.endsWith(suffix)) title = title.slice(0, -suffix.length);
    return { id: `${a.ticker}-N${i + 1}`, kind: "news" as const, title, outlet, url: String(it.link ?? ""), time: new Date(String(it.pubDate ?? Date.now())).toISOString() };
  });
}
