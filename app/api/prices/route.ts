import { fetchQuotes } from "@/lib/signals/prices";
import { llmConfig } from "@/lib/agent";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const { quotes, errors } = await fetchQuotes();
  const cfg = llmConfig();
  return Response.json({ quotes, errors, aiMode: cfg.mode, provider: cfg.provider }, { headers: { "Cache-Control": "no-store" } });
}
