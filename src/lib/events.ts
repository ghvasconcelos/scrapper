import { all, get, run } from "./db";
import { registerContact, type Loggable } from "./leads";
import { logEvent } from "./log";
import { EVENT_STATUS, EVENT_TYPES } from "./log-meta";
import type { CalEvent, EventStatus, EventType, Followup } from "./types";

/**
 * A Agenda: compromissos ligados a leads, no jeito da Agenda do CRM do
 * ProHand (sql/44) — tipo, horário, responsável e um status para o que
 * aconteceu: agendado → realizado | no-show | cancelado. Remarcar não é
 * no-show: é só trocar a hora.
 *
 * Tudo vai para o histórico do lead. Reunião **realizada** vira um contato
 * (conta nos Indicadores e tira o lead de "Novo", como um contato pela ficha).
 */

const COLS = `e.id, e.lead_id, COALESCE(l.name, e.lead_name) AS lead_name, e.title, e.type,
  to_char(e.starts_at, 'YYYY-MM-DD HH24:MI') AS starts_at, e.duration_min,
  e.owner, e.notes, e.status, e.created_at, e.updated_at`;
const FROM = "FROM events e LEFT JOIN leads l ON l.id = e.lead_id";

export function listEvents(from: string, to: string): Promise<CalEvent[]> {
  return all<CalEvent>(`SELECT ${COLS} ${FROM} WHERE e.starts_at::date BETWEEN ?::date AND ?::date ORDER BY e.starts_at`, from, to);
}

export function leadEvents(leadId: number): Promise<CalEvent[]> {
  return all<CalEvent>(`SELECT ${COLS} ${FROM} WHERE e.lead_id = ? ORDER BY e.starts_at DESC LIMIT 30`, leadId);
}

export async function getEvent(id: number): Promise<CalEvent | null> {
  return (await get<CalEvent>(`SELECT ${COLS} ${FROM} WHERE e.id = ?`, id)) ?? null;
}

/** Os retornos marcados nos leads (next_followup) no período, só de leads ainda em aberto. */
export function listFollowups(from: string, to: string): Promise<Followup[]> {
  return all<Followup>(`SELECT l.id AS lead_id, l.name, l.next_followup AS date, l.owner FROM leads l
    JOIN stages s ON s.id = l.stage_id WHERE s.kind = 'open' AND l.next_followup BETWEEN ?::date AND ?::date
    ORDER BY l.next_followup, lower(l.name)`, from, to);
}

export interface EventInput {
  lead_id: number | null;
  title: string;
  type: EventType;
  starts_at: string;
  duration_min: number;
  owner: string;
  notes: string;
}

const START = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/** O que a API confere antes de gravar; devolve a mensagem do erro, ou null. */
export function validateEvent(b: Partial<EventInput & { status: EventStatus }>): string | null {
  if (b.starts_at !== undefined && !START.test(b.starts_at)) return "Informe a data e a hora.";
  if (b.type !== undefined && !EVENT_TYPES.some((t) => t.type === b.type)) return "Tipo de compromisso inválido.";
  if (b.status !== undefined && !(b.status in EVENT_STATUS)) return "Situação inválida.";
  return null;
}

const label = (type: EventType) => EVENT_TYPES.find((t) => t.type === type)?.label ?? "Compromisso";
/** "09/10/2026 às 14:00" */
const when = (startsAt: string) => {
  const [d, t] = startsAt.split(" ");
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y} às ${t}`;
};
/** Um compromisso realizado conta como contato do tipo mais próximo; tarefa feita é só uma nota. */
const contactKind = (type: EventType): Loggable => (type === "ligacao" ? "ligacao" : type === "tarefa" ? "nota" : "reuniao");

const leadName = async (id: number | null) =>
  id ? ((await get<{ name: string }>("SELECT name FROM leads WHERE id = ?", id))?.name ?? "") : "";

export async function createEvent(input: EventInput, author = ""): Promise<CalEvent> {
  const name = await leadName(input.lead_id);
  const res = await get<{ id: number }>(`INSERT INTO events (lead_id, lead_name, title, type, starts_at, duration_min, owner, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    input.lead_id, name, input.title, input.type, input.starts_at, input.duration_min, input.owner, input.notes);
  const ev = (await getEvent(res!.id))!;
  if (input.lead_id) {
    await logEvent({ leadId: input.lead_id, leadName: name, action: "agendou", kind: input.type,
      text: `${label(ev.type)} marcada para ${when(ev.starts_at)}: ${ev.title}`, author });
  }
  return ev;
}

const EDITABLE = ["title", "type", "starts_at", "duration_min", "owner", "notes", "status"] as const;
export type EventPatch = Partial<Pick<CalEvent, (typeof EDITABLE)[number]>>;

export async function updateEvent(id: number, patch: EventPatch, author = ""): Promise<CalEvent | null> {
  const before = await getEvent(id);
  if (!before) return null;
  const keys = EDITABLE.filter((k) => k in patch && String(patch[k] ?? "") !== String(before[k] ?? ""));
  if (!keys.length) return before;
  await run(`UPDATE events SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = agora() WHERE id = ?`,
    ...keys.map((k) => patch[k] as string | number), id);
  const after = (await getEvent(id))!;
  if (before.lead_id) {
    const base = { leadId: before.lead_id, leadName: after.lead_name, author };
    const status = patch.status;
    if (status === "realizado" && before.status !== "realizado") {
      await registerContact(before.lead_id, contactKind(after.type), `${label(after.type)} realizada: ${after.title}`, author);
    } else if (status && status !== before.status) {
      await logEvent({ ...base, action: "editou", text: `${label(after.type)} "${after.title}": ${EVENT_STATUS[before.status]} → ${EVENT_STATUS[status]}` });
    } else if (keys.includes("starts_at")) {
      await logEvent({ ...base, action: "agendou", kind: after.type, text: `${label(after.type)} remarcada para ${when(after.starts_at)}: ${after.title}` });
    } else {
      await logEvent({ ...base, action: "editou", text: `${label(after.type)} "${after.title}" editada` });
    }
  }
  return after;
}

export async function deleteEvent(id: number, author = ""): Promise<boolean> {
  const ev = await getEvent(id);
  if (!ev) return false;
  await run("DELETE FROM events WHERE id = ?", id);
  if (ev.lead_id) await logEvent({ leadId: ev.lead_id, leadName: ev.lead_name, action: "editou", text: `${label(ev.type)} excluída: ${ev.title}`, author });
  return true;
}
