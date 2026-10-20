import { all, get, parseJson, run, transaction } from "./db";
import type { EnrichedLead } from "./enrich";
import { leadHistory, logEvent } from "./log";
import { describeChanges } from "./log-meta";
import type { Activity, Lead, LogEntry, Stage } from "./types";

type Row = Record<string, unknown>;

export function toLead(r: Row): Lead {
  return {
    ...(r as unknown as Lead),
    marketing_arguments: parseJson<string[]>(r.marketing_arguments, []),
  };
}

export async function listStages(): Promise<Stage[]> {
  return all<Stage>("SELECT id, name, position, kind FROM stages ORDER BY position");
}

export async function firstStageId(): Promise<number> {
  const stages = await listStages();
  return stages.find((s) => s.kind === "open")?.id ?? stages[0].id;
}

const LEAD_COLUMNS = `id, place_id, name, category, phone, whatsapp, whatsapp_source, email, instagram, facebook,
  website, website_kind, address, city, maps_link, rating, reviews, priority, needs_site, site_argument,
  marketing_arguments, stage_id, owner, value, next_followup, last_contact_at, lat, lng, search_id, created_at, updated_at`;

export interface LeadFilters {
  q?: string;
  priority?: string;
  stage?: string;
  needs_site?: string;
  category?: string;
  search?: string;
  city?: string;
  owner?: string;
  has_whatsapp?: boolean;
  has_instagram?: boolean;
  followup?: "overdue" | "today" | "upcoming";
  from?: string; // entraram no período (created_at), YYYY-MM-DD
  to?: string;
}

const SORTS: Record<string, string> = {
  priority: "CASE priority WHEN 'ALTA' THEN 0 WHEN 'MÉDIA' THEN 1 ELSE 2 END",
  name: "lower(name)",
  rating: "COALESCE(rating, 0)",
  reviews: "reviews",
  followup: "COALESCE(next_followup, '9999-12-31')",
  created: "created_at",
  stage: "(SELECT position FROM stages WHERE stages.id = leads.stage_id)",
};

export async function listLeads(f: LeadFilters, sort = "priority", dir: "asc" | "desc" = "asc"): Promise<Lead[]> {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (f.q) {
    where.push("(name ILIKE ? OR category ILIKE ? OR address ILIKE ? OR phone ILIKE ? OR instagram ILIKE ?)");
    const like = `%${f.q}%`;
    args.push(like, like, like, like, like);
  }
  if (f.priority) { where.push("priority = ?"); args.push(f.priority); }
  if (f.stage) { where.push("stage_id = ?"); args.push(Number(f.stage)); }
  if (f.needs_site) { where.push("needs_site = ?"); args.push(f.needs_site); }
  if (f.category) { where.push("category = ?"); args.push(f.category); }
  if (f.search) { where.push("search_id = ?"); args.push(Number(f.search)); }
  if (f.city) { where.push("city = ?"); args.push(f.city); }
  if (f.owner) { where.push("owner = ?"); args.push(f.owner); }
  if (f.has_whatsapp) where.push("whatsapp <> ''");
  if (f.has_instagram) where.push("instagram <> ''");
  if (f.followup === "overdue") where.push("next_followup < agora()::date");
  if (f.followup === "today") where.push("next_followup = agora()::date");
  if (f.followup === "upcoming") where.push("next_followup >= agora()::date");
  if (f.from) { where.push("created_at::date >= ?::date"); args.push(f.from); }
  if (f.to) { where.push("created_at::date <= ?::date"); args.push(f.to); }
  const order = SORTS[sort] ?? SORTS.priority;
  const sql = `SELECT ${LEAD_COLUMNS} FROM leads ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY ${order} ${dir === "desc" ? "DESC" : "ASC"}, reviews DESC LIMIT 2000`;
  return (await all(sql, ...args)).map(toLead);
}

export async function getLead(id: number): Promise<Lead | null> {
  const r = await get(`SELECT ${LEAD_COLUMNS} FROM leads WHERE id = ?`, id);
  return r ? toLead(r) : null;
}

/** A linha do tempo da ficha: o histórico do lead no formato que a ficha desenha (ícone por tipo). */
export async function listActivities(leadId: number): Promise<Activity[]> {
  const type = (e: LogEntry): Activity["type"] =>
    e.action === "contatou" ? (e.kind as Activity["type"]) : e.action === "anotou" ? "nota" : "sistema";
  return (await leadHistory(leadId)).map((e) => ({ id: e.id, lead_id: e.lead_id, type: type(e), text: e.text, author: e.author, created_at: e.created_at }));
}

const leadName = async (id: number) => (await get<{ name: string }>("SELECT name FROM leads WHERE id = ?", id))?.name ?? "";

export type Loggable = Exclude<Activity["type"], "sistema">; // "sistema" é o que o CRM grava sozinho, nunca a pessoa

/** Registra um contato ou uma nota no histórico; contato também marca o último contato do lead. */
export async function addActivity(leadId: number, type: Loggable, text: string, author = ""): Promise<void> {
  const contact = type !== "nota";
  await logEvent({ leadId, leadName: await leadName(leadId), action: contact ? "contatou" : "anotou", kind: contact ? type : "", text, author });
  if (contact) await run("UPDATE leads SET last_contact_at = agora() WHERE id = ?", leadId);
}

const EDITABLE = ["stage_id", "owner", "value", "next_followup", "name", "phone", "whatsapp", "email", "instagram",
  "facebook", "priority"] as const;
export type LeadPatch = Partial<Pick<Lead, (typeof EDITABLE)[number]>>;
/** Campos em que vazio quer dizer "sem valor" (o Postgres não aceita "" como data ou número). */
const NULLABLE = new Set<string>(["value", "next_followup"]);

/**
 * Grava só o que mudou e registra no histórico o antes → depois de cada campo.
 * Troca de etapa é "moveu" (é dela que os Indicadores contam as movimentações);
 * o resto é "editou". Salvar sem mudar nada não grava nem registra.
 */
export async function updateLead(id: number, patch: LeadPatch, author = ""): Promise<Lead | null> {
  const before = await getLead(id);
  if (!before) return null;
  const changes: Record<string, [unknown, unknown]> = {};
  for (const k of EDITABLE) {
    if (!(k in patch)) continue;
    const a = before[k] ?? null;
    const raw = patch[k] ?? null;
    const b = NULLABLE.has(k) && raw === "" ? null : raw;
    if (String(a ?? "") !== String(b ?? "")) changes[k] = [a, b];
  }
  const keys = Object.keys(changes) as (keyof typeof changes)[];
  if (!keys.length) return before;
  await transaction(async () => {
    await run(`UPDATE leads SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = agora() WHERE id = ?`,
      ...keys.map((k) => changes[k][1] as string | number | null), id);
    const moved = "stage_id" in changes;
    await logEvent({
      leadId: id,
      leadName: before.name,
      action: moved ? "moveu" : "editou",
      stageTo: moved ? (patch.stage_id ?? null) : null,
      text: describeChanges(changes, await listStages()),
      changes,
      author,
    });
  });
  return getLead(id);
}

/**
 * Um contato feito (pela ficha ou por uma reunião realizada na Agenda):
 * registra, e lead ainda em "Novo" passa para a etapa seguinte, com o próximo
 * retorno marcado quando não tem nenhum. Nota só registra.
 */
export async function registerContact(leadId: number, type: Loggable, text: string, author = "", followupDays = 2): Promise<void> {
  const lead = await getLead(leadId);
  if (!lead) return;
  await addActivity(leadId, type, text, author);
  if (type === "nota") return;
  const open = (await listStages()).filter((s) => s.kind === "open");
  const patch: LeadPatch = {};
  if (lead.stage_id === open[0]?.id && open[1]) patch.stage_id = open[1].id;
  if (!lead.next_followup || lead.next_followup < new Date().toLocaleDateString("sv-SE")) {
    const d = new Date();
    d.setDate(d.getDate() + followupDays);
    patch.next_followup = d.toLocaleDateString("sv-SE");
  }
  if (Object.keys(patch).length) await updateLead(leadId, patch, author);
}

/** Apaga de verdade, mas o histórico guarda que o lead existiu e quem excluiu. */
export async function deleteLeads(ids: number[], author = ""): Promise<number> {
  if (!ids.length) return 0;
  const marks = ids.map(() => "?").join(",");
  return transaction(async () => {
    const rows = await all<{ id: number; name: string }>(`SELECT id, name FROM leads WHERE id IN (${marks})`, ...ids);
    for (const r of rows) await logEvent({ leadId: r.id, leadName: r.name, action: "excluiu", text: "Lead excluído", author });
    return run(`DELETE FROM leads WHERE id IN (${marks})`, ...ids);
  });
}

/** Os campos que vêm do Google Maps: quando uma busca nova muda algum deles, o histórico mostra o antes → depois. */
const SCRAPED = ["category", "phone", "whatsapp", "email", "instagram", "facebook", "website", "address", "rating", "reviews", "priority", "needs_site"] as const;

const coord = (s: string | undefined): number | null => {
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
};

/** Inserts new leads and refreshes scraped fields on known ones, never touching CRM work (stage, notes, follow-up). */
export async function upsertLeads(items: EnrichedLead[], searchId: number, city: string): Promise<{ imported: number; updated: number }> {
  const stage = await firstStageId();
  let imported = 0;
  let updated = 0;
  await transaction(async () => {
    for (const l of items) {
      const hit = l.place_id
        ? await get<{ id: number }>("SELECT id FROM leads WHERE place_id = ?", l.place_id)
        : await get<{ id: number }>("SELECT id FROM leads WHERE place_id IS NULL AND name = ? AND address = ?", l.name, l.address);
      const mkt = JSON.stringify(l.marketing_arguments);
      const raw = JSON.stringify(l.raw);
      const lat = coord(l.raw.latitude);
      const lng = coord(l.raw.longitude);
      if (hit) {
        const before = (await get(`SELECT ${SCRAPED.join(", ")} FROM leads WHERE id = ?`, hit.id))!;
        await run(`UPDATE leads SET category=?, phone=?, whatsapp=?, whatsapp_source=?, email=?, instagram=?,
          facebook=?, website=?, website_kind=?, address=?, maps_link=?, rating=?, reviews=?, priority=?, needs_site=?,
          site_argument=?, marketing_arguments=?, raw=?, lat=?, lng=?, updated_at=agora() WHERE id=?`,
          l.category, l.phone, l.whatsapp, l.whatsapp_source, l.email, l.instagram, l.facebook, l.website,
          l.website_kind, l.address, l.maps_link, l.rating, l.reviews, l.priority, l.needs_site, l.site_argument,
          mkt, raw, lat, lng, hit.id);
        // o que o Maps mudou desde a última busca vai para o histórico, com antes → depois
        const changes: Record<string, [unknown, unknown]> = {};
        for (const k of SCRAPED) {
          const a = before[k] ?? null;
          const b = l[k] ?? null;
          if (String(a ?? "") !== String(b ?? "")) changes[k] = [a, b];
        }
        if (Object.keys(changes).length) {
          await logEvent({ leadId: hit.id, leadName: l.name, action: "atualizou", text: `Atualizado pelo Google Maps · ${describeChanges(changes)}`, changes });
        }
        updated++;
      } else {
        const res = await get<{ id: number }>(`INSERT INTO leads (place_id, name, category, phone, whatsapp, whatsapp_source, email,
          instagram, facebook, website, website_kind, address, city, maps_link, rating, reviews, priority, needs_site,
          site_argument, marketing_arguments, stage_id, search_id, raw, lat, lng)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
          l.place_id, l.name, l.category, l.phone, l.whatsapp, l.whatsapp_source, l.email,
          l.instagram, l.facebook, l.website, l.website_kind, l.address, city, l.maps_link, l.rating, l.reviews,
          l.priority, l.needs_site, l.site_argument, mkt, stage, searchId, raw, lat, lng);
        await logEvent({ leadId: res!.id, leadName: l.name, action: "criou", text: "Importado do Google Maps" });
        imported++;
      }
    }
  });
  return { imported, updated };
}
