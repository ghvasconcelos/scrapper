import type { NextRequest } from "next/server";
import { json } from "@/lib/http";
import { listLog } from "@/lib/log";

/** A tela de Histórico: ?q=&action=&author=&from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  return json(listLog({
    q: p.get("q") || undefined,
    action: p.get("action") || undefined,
    author: p.get("author") || undefined,
    from: p.get("from") || undefined,
    to: p.get("to") || undefined,
  }));
}
