import { all, getSetting } from "@/lib/db";
import { json } from "@/lib/http";
import { listStages } from "@/lib/leads";
import { listSearches } from "@/lib/searches";

/** Everything the filter bars and selects need, in one request. */
export async function GET() {
  const col = async (sql: string) => (await all<{ v: string }>(sql)).map((r) => r.v);
  const [stages, categories, cities, searches, team] = await Promise.all([
    listStages(),
    col("SELECT DISTINCT category AS v FROM leads WHERE category <> '' ORDER BY category"),
    col("SELECT DISTINCT city AS v FROM leads WHERE city <> '' ORDER BY city"),
    listSearches(),
    getSetting("team", ""),
  ]);
  return json({
    stages,
    categories,
    cities,
    searches: searches.map((s) => ({ id: s.id, label: s.label, city: s.city })),
    team: team.split(",").map((s) => s.trim()).filter(Boolean),
  });
}
