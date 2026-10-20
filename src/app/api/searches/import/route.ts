import { fail, json } from "@/lib/http";
import { getJob } from "@/lib/scraper";
import { insertSearch } from "@/lib/searches";

/** Import a scraper job that was started outside the CRM. The worker picks it up within seconds. */
export async function POST(req: Request) {
  const { jobId, city } = (await req.json()) as { jobId?: string; city?: string };
  if (!jobId) return fail("Job não informado.");
  let job;
  try {
    job = await getJob(jobId);
  } catch {
    return fail("Não encontrei esse job no scraper.", 404);
  }
  const keywords = job.Data?.keywords ?? [];
  // "restaurantes em Anápolis GO" → city "Anápolis GO" when not given.
  const guessed = city?.trim() || keywords[0]?.split(/\s+em\s+/i)[1]?.trim() || "";
  const terms = keywords.map((k) => k.split(/\s+em\s+/i)[0]);
  const label = terms.length <= 3 ? terms.join(", ") : `${terms.slice(0, 2).join(", ")} e mais ${terms.length - 2}`;
  const rawMax = job.Data?.max_time ?? 900;
  const search = await insertSearch({
    scraper_job_id: jobId, label: label || job.Name, keywords, city: guessed,
    depth: job.Data?.depth ?? 0, max_time: rawMax > 1e6 ? Math.round(rawMax / 1e9) : rawMax, // API stores nanoseconds
  });
  return json({ search }, 201);
}
