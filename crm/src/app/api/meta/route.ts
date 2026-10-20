import { db, getSetting } from "@/lib/db";
import { json } from "@/lib/http";
import { listStages } from "@/lib/leads";
import { listSearches } from "@/lib/searches";

/** Everything the filter bars and selects need, in one request. */
export async function GET() {
  const col = (sql: string) => (db().prepare(sql).all() as { v: string }[]).map((r) => r.v);
  return json({
    stages: listStages(),
    categories: col("SELECT DISTINCT category AS v FROM leads WHERE category <> '' ORDER BY category"),
    cities: col("SELECT DISTINCT city AS v FROM leads WHERE city <> '' ORDER BY city"),
    searches: listSearches().map((s) => ({ id: s.id, label: s.label, city: s.city })),
    team: getSetting("team", "").split(",").map((s) => s.trim()).filter(Boolean),
  });
}
