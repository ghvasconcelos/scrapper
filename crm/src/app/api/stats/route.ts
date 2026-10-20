import { db } from "@/lib/db";
import { json } from "@/lib/http";
import { listStages, toLead } from "@/lib/leads";
import { listSearches } from "@/lib/searches";

export async function GET() {
  const d = db();
  const stages = listStages();
  const first = stages.find((s) => s.kind === "open")!;
  const won = stages.filter((s) => s.kind === "won").map((s) => s.id);
  const open = stages.filter((s) => s.kind === "open").map((s) => s.id);
  const inList = (ids: number[]) => (ids.length ? ids.join(",") : "-1");

  const counts = d.prepare("SELECT stage_id, COUNT(*) AS n, COALESCE(SUM(value),0) AS total FROM leads GROUP BY stage_id")
    .all() as { stage_id: number; n: number; total: number }[];
  const byStage = stages.map((s) => {
    const c = counts.find((x) => x.stage_id === s.id);
    return { ...s, count: c?.n ?? 0, total: c?.total ?? 0 };
  });

  const one = (sql: string) => (d.prepare(sql).get() as { n: number }).n;
  const kpis = {
    total: one("SELECT COUNT(*) AS n FROM leads"),
    inPipeline: one(`SELECT COUNT(*) AS n FROM leads WHERE stage_id IN (${inList(open)}) AND stage_id <> ${first.id}`),
    toContact: one(`SELECT COUNT(*) AS n FROM leads WHERE priority = 'ALTA' AND stage_id = ${first.id}`),
    overdue: one(`SELECT COUNT(*) AS n FROM leads WHERE next_followup < date('now','localtime') AND stage_id IN (${inList(open)})`),
    today: one(`SELECT COUNT(*) AS n FROM leads WHERE next_followup = date('now','localtime') AND stage_id IN (${inList(open)})`),
    won: one(`SELECT COUNT(*) AS n FROM leads WHERE stage_id IN (${inList(won)})`),
    wonValue: (d.prepare(`SELECT COALESCE(SUM(value),0) AS n FROM leads WHERE stage_id IN (${inList(won)})`).get() as { n: number }).n,
  };

  const followups = (d.prepare(`SELECT * FROM leads WHERE next_followup IS NOT NULL
      AND next_followup <= date('now','localtime','+7 days') AND stage_id IN (${inList(open)})
      ORDER BY next_followup, priority LIMIT 12`).all() as Record<string, unknown>[]).map(toLead);
  const opportunities = (d.prepare(`SELECT * FROM leads WHERE priority = 'ALTA' AND stage_id = ${first.id}
      ORDER BY reviews DESC LIMIT 8`).all() as Record<string, unknown>[]).map(toLead);

  return json({ kpis, byStage, followups, opportunities, searches: listSearches().slice(0, 4) });
}
