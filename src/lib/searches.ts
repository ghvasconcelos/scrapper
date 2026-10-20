import { parse } from "csv-parse/sync";
import { all, get, parseJson, run } from "./db";
import { enrichRows, type RawRow } from "./enrich";
import { upsertLeads } from "./leads";
import { downloadCsv, getJob } from "./scraper";
import type { Search } from "./types";

type Row = Record<string, unknown>;

function toSearch(r: Row): Search {
  return { ...(r as unknown as Search), keywords: parseJson<string[]>(r.keywords, []) };
}

export async function listSearches(): Promise<Search[]> {
  return (await all("SELECT * FROM searches ORDER BY created_at DESC, id DESC")).map(toSearch);
}

export async function getSearch(id: number): Promise<Search | null> {
  const r = await get("SELECT * FROM searches WHERE id = ?", id);
  return r ? toSearch(r) : null;
}

export async function insertSearch(s: {
  scraper_job_id: string; label: string; keywords: string[]; city: string; depth: number; max_time: number;
}): Promise<Search> {
  const res = await get<{ id: number }>(`INSERT INTO searches (scraper_job_id, label, keywords, city, depth, max_time, status)
    VALUES (?, ?, ?, ?, ?, ?, 'running') RETURNING id`,
    s.scraper_job_id, s.label, JSON.stringify(s.keywords), s.city, s.depth, s.max_time);
  return (await getSearch(res!.id))!;
}

async function patch(id: number, fields: Partial<Record<"status" | "found" | "imported" | "updated" | "progress" | "error", string | number>>, finish = false) {
  const keys = Object.keys(fields);
  await run(`UPDATE searches SET ${keys.map((k) => `${k} = ?`).join(", ")}${finish ? ", finished_at = agora()" : ""} WHERE id = ?`,
    ...keys.map((k) => fields[k as keyof typeof fields]!), id);
}

// ---- background worker: follows running scraper jobs and imports them when done ----

type Global = typeof globalThis & { __crmWorker?: { timer: NodeJS.Timeout; busy: Set<number> } };

async function importSearch(s: Search) {
  await patch(s.id, { status: "importing", progress: 0, error: "" });
  const csv = await downloadCsv(s.scraper_job_id);
  const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true }) as RawRow[];
  await patch(s.id, { found: rows.length });
  let last = 0;
  const leads = await enrichRows(rows, (n) => {
    if (n - last >= 5 || n === rows.length) { last = n; void patch(s.id, { progress: n }).catch(() => {}); }
  });
  const { imported, updated } = await upsertLeads(leads, s.id, s.city);
  await patch(s.id, { status: "done", imported, updated, progress: rows.length }, true);
}

async function tick(busy: Set<number>) {
  const active = await all("SELECT * FROM searches WHERE status IN ('running','importing')");
  for (const s of active.map(toSearch)) {
    if (busy.has(s.id)) continue;
    busy.add(s.id);
    try {
      if (s.status === "importing") {
        // An import interrupted by a server restart: start it over.
        await importSearch(s);
        continue;
      }
      const job = await getJob(s.scraper_job_id);
      if (job.Status === "ok") await importSearch(s);
      else if (job.Status === "failed") await patch(s.id, { status: "failed", error: "O scraper marcou a busca como falha. Pode ser bloqueio temporário do Google: espere um pouco ou use proxies." }, true);
      else {
        if (s.error) await patch(s.id, { error: "" });
        const maxTime = s.max_time;
        const elapsed = (Date.now() - new Date(s.created_at.replace(" ", "T")).getTime()) / 1000;
        if (elapsed > maxTime + 20 * 60) await patch(s.id, { status: "failed", error: "A busca passou muito do tempo limite e foi encerrada." }, true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/fetch failed|ECONNREFUSED|timeout|aborted/i.test(msg)) {
        await patch(s.id, { error: "Scraper fora do ar. Abra o Docker Desktop; a busca continua quando ele voltar." });
      } else {
        await patch(s.id, { status: "failed", error: msg.slice(0, 300) }, true);
      }
    } finally {
      busy.delete(s.id);
    }
  }
}

export function startWorker() {
  const g = globalThis as Global;
  if (g.__crmWorker) return;
  const busy = new Set<number>();
  g.__crmWorker = { busy, timer: setInterval(() => void tick(busy).catch(() => {}), 5000) };
  void tick(busy).catch(() => {});
}
