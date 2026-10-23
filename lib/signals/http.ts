import { FETCH_TIMEOUT_MS } from "../config";
export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
export async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`${new URL(url).host} HTTP ${res.status}`);
  return res.text();
}
export async function getJson<T>(url: string): Promise<T> { return JSON.parse(await getText(url)) as T }
