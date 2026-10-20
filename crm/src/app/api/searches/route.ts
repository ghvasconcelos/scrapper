import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { createJob, geocode, listJobs, type ScraperJob } from "@/lib/scraper";
import { insertSearch, listSearches } from "@/lib/searches";

/** CRM searches plus finished scraper jobs that were never imported (e.g. run from the terminal). */
export async function GET() {
  const searches = listSearches();
  let external: { id: string; name: string; date: string; status: string; keywords: string[] }[] = [];
  let scraperOk = true;
  try {
    const known = new Set(searches.map((s) => s.scraper_job_id));
    external = (await listJobs())
      .filter((j: ScraperJob) => !known.has(j.ID))
      .map((j) => ({ id: j.ID, name: j.Name, date: j.Date, status: j.Status, keywords: j.Data?.keywords ?? [] }));
  } catch {
    scraperOk = false;
  }
  return json({ searches, external, scraperOk });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    terms?: string[]; city?: string; depth?: number; email?: boolean; radiusKm?: number;
  };
  const terms = (body.terms ?? []).map((t) => t.trim()).filter(Boolean);
  const city = (body.city ?? "").trim();
  if (!terms.length) return fail("Escolha pelo menos um tipo de negócio.");
  if (!city) return fail("Informe a cidade, por exemplo: Anápolis, GO.");
  const depth = Math.min(Math.max(Math.round(body.depth ?? 2), 1), 20);

  let place;
  try {
    place = await geocode(city);
  } catch {
    return fail("Não consegui localizar a cidade agora (sem internet?). Tente de novo em instantes.", 502);
  }
  if (!place) return fail(`Não encontrei "${city}". Escreva no formato Cidade, UF, por exemplo: Anápolis, GO.`);

  const where = city.replace(/\s*,\s*/, " ").trim();
  const keywords = terms.map((t) => `${t} em ${where}`);
  // Rough budget: website visits for e-mails dominate; 20 places per term per depth step.
  const maxTime = Math.min(3600, Math.max(600, terms.length * depth * 90));
  let jobId: string;
  try {
    jobId = await createJob({
      name: `crm: ${terms.slice(0, 3).join(", ")}${terms.length > 3 ? "…" : ""} em ${where}`,
      keywords, lat: place.lat, lon: place.lon, depth, email: body.email ?? true, max_time: maxTime,
      radius: Math.round((body.radiusKm ?? 10) * 1000),
    });
  } catch {
    return fail("O scraper não respondeu. Abra o Docker Desktop e confira se o scraper está rodando (Configurações).", 503);
  }
  const label = terms.length <= 3 ? terms.join(", ") : `${terms.slice(0, 2).join(", ")} e mais ${terms.length - 2}`;
  const search = insertSearch({ scraper_job_id: jobId, label, keywords, city, depth, max_time: maxTime });
  return json({ search }, 201);
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  db().prepare("DELETE FROM searches WHERE id = ? AND status IN ('done','failed')").run(id);
  return json({ searches: listSearches() });
}
