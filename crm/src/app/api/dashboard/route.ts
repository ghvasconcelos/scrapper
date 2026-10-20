import type { NextRequest } from "next/server";
import { addDaysISO, todayISO } from "@/lib/format";
import { json } from "@/lib/http";
import { dashboard } from "@/lib/log";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Os Indicadores de um período: ?from=YYYY-MM-DD&to=YYYY-MM-DD (padrão: últimos 30 dias). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  let from = p.get("from") || "";
  let to = p.get("to") || "";
  if (!DATE.test(from)) from = addDaysISO(-29);
  if (!DATE.test(to)) to = todayISO();
  if (from > to) [from, to] = [to, from];
  return json(dashboard(from, to));
}
