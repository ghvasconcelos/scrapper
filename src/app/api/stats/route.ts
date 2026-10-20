import { all, get } from "@/lib/db";
import { json } from "@/lib/http";
import { listStages, toLead } from "@/lib/leads";
import { listSearches } from "@/lib/searches";

export async function GET() {
  const stages = await listStages();
  const first = stages.find((s) => s.kind === "open")!;
  const won = stages.filter((s) => s.kind === "won").map((s) => s.id);
  const open = stages.filter((s) => s.kind === "open").map((s) => s.id);
  const inList = (ids: number[]) => (ids.length ? ids.join(",") : "-1");
  const one = async (sql: string) => (await get<{ n: number }>(sql))!.n;

  const [counts, total, inPipeline, toContact, overdue, today, wonCount, wonValue, followups, opportunities, searches] =
    await Promise.all([
      all<{ stage_id: number; n: number; total: number }>(
        "SELECT stage_id, COUNT(*)::int AS n, COALESCE(SUM(value), 0) AS total FROM leads GROUP BY stage_id"),
      one("SELECT COUNT(*)::int AS n FROM leads"),
      one(`SELECT COUNT(*)::int AS n FROM leads WHERE stage_id IN (${inList(open)}) AND stage_id <> ${first.id}`),
      one(`SELECT COUNT(*)::int AS n FROM leads WHERE priority = 'ALTA' AND stage_id = ${first.id}`),
      one(`SELECT COUNT(*)::int AS n FROM leads WHERE next_followup < agora()::date AND stage_id IN (${inList(open)})`),
      one(`SELECT COUNT(*)::int AS n FROM leads WHERE next_followup = agora()::date AND stage_id IN (${inList(open)})`),
      one(`SELECT COUNT(*)::int AS n FROM leads WHERE stage_id IN (${inList(won)})`),
      one(`SELECT COALESCE(SUM(value), 0) AS n FROM leads WHERE stage_id IN (${inList(won)})`),
      all(`SELECT * FROM leads WHERE next_followup IS NOT NULL
        AND next_followup <= agora()::date + 7 AND stage_id IN (${inList(open)})
        ORDER BY next_followup, priority LIMIT 12`),
      all(`SELECT * FROM leads WHERE priority = 'ALTA' AND stage_id = ${first.id} ORDER BY reviews DESC LIMIT 8`),
      listSearches(),
    ]);

  const byStage = stages.map((s) => {
    const c = counts.find((x) => x.stage_id === s.id);
    return { ...s, count: c?.n ?? 0, total: c?.total ?? 0 };
  });
  const kpis = { total, inPipeline, toContact, overdue, today, won: wonCount, wonValue };

  return json({ kpis, byStage, followups: followups.map(toLead), opportunities: opportunities.map(toLead), searches: searches.slice(0, 4) });
}
