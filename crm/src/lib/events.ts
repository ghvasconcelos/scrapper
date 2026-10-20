import { db } from "./db";
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

const COLS = `e.id, e.lead_id, COALESCE(l.name, e.lead_name) AS lead_name, e.title, e.type, e.starts_at, e.duration_min,
  e.owner, e.notes, e.status, e.created_at, e.updated_at`;
const FROM = "FROM events e LEFT JOIN leads l ON l.id = e.lead_id";

export function listEvents(from: string, to: string): CalEvent[] {
  return db().prepare(`SELECT ${COLS} ${FROM} WHERE substr(e.starts_at, 1, 10) BETWEEN ? AND ? ORDER BY e.starts_at`)
    .all(from, to) as unknown as CalEvent[];
}

export function leadEvents(leadId: number): CalEvent[] {
  return db().prepare(`SELECT ${COLS} ${FROM} WHERE e.lead_id = ? ORDER BY e.starts_at DESC LIMIT 30`).all(leadId) as unknown as CalEvent[];
}

export function getEvent(id: number): CalEvent | null {
  return (db().prepare(`SELECT ${COLS} ${FROM} WHERE e.id = ?`).get(id) as unknown as CalEvent | undefined) ?? null;
}

/** Os retornos marcados nos leads (next_followup) no período, só de leads ainda em aberto. */
export function listFollowups(from: string, to: string): Followup[] {
  return db().prepare(`SELECT l.id AS lead_id, l.name, l.next_followup AS date, l.owner FROM leads l
    JOIN stages s ON s.id = l.stage_id WHERE s.kind = 'open' AND l.next_followup BETWEEN ? AND ?
    ORDER BY l.next_followup, l.name COLLATE NOCASE`).all(from, to) as unknown as Followup[];
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

const leadName = (id: number | null) =>
  id ? ((db().prepare("SELECT name FROM leads WHERE id = ?").get(id) as { name: string } | undefined)?.name ?? "") : "";

export function createEvent(input: EventInput, author = ""): CalEvent {
  const name = leadName(input.lead_id);
  const res = db().prepare(`INSERT INTO events (lead_id, lead_name, title, type, starts_at, duration_min, owner, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(input.lead_id, name, input.title, input.type, input.starts_at, input.duration_min, input.owner, input.notes);
  const ev = getEvent(Number(res.lastInsertRowid))!;
  if (input.lead_id) {
    logEvent({ leadId: input.lead_id, leadName: name, action: "agendou", kind: input.type,
      text: `${label(ev.type)} marcada para ${when(ev.starts_at)}: ${ev.title}`, author });
  }
  return ev;
}

const EDITABLE = ["title", "type", "starts_at", "duration_min", "owner", "notes", "status"] as const;
export type EventPatch = Partial<Pick<CalEvent, (typeof EDITABLE)[number]>>;

export function updateEvent(id: number, patch: EventPatch, author = ""): CalEvent | null {
  const before = getEvent(id);
  if (!before) return null;
  const keys = EDITABLE.filter((k) => k in patch && String(patch[k] ?? "") !== String(before[k] ?? ""));
  if (!keys.length) return before;
  db().prepare(`UPDATE events SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = datetime('now','localtime') WHERE id = ?`)
    .run(...keys.map((k) => patch[k] as string | number), id);
  const after = getEvent(id)!;
  if (before.lead_id) {
    const base = { leadId: before.lead_id, leadName: after.lead_name, author };
    const status = patch.status;
    if (status === "realizado" && before.status !== "realizado") {
      registerContact(before.lead_id, contactKind(after.type), `${label(after.type)} realizada: ${after.title}`, author);
    } else if (status && status !== before.status) {
      logEvent({ ...base, action: "editou", text: `${label(after.type)} "${after.title}": ${EVENT_STATUS[before.status]} → ${EVENT_STATUS[status]}` });
    } else if (keys.includes("starts_at")) {
      logEvent({ ...base, action: "agendou", kind: after.type, text: `${label(after.type)} remarcada para ${when(after.starts_at)}: ${after.title}` });
    } else {
      logEvent({ ...base, action: "editou", text: `${label(after.type)} "${after.title}" editada` });
    }
  }
  return after;
}

export function deleteEvent(id: number, author = ""): boolean {
  const ev = getEvent(id);
  if (!ev) return false;
  db().prepare("DELETE FROM events WHERE id = ?").run(id);
  if (ev.lead_id) logEvent({ leadId: ev.lead_id, leadName: ev.lead_name, action: "editou", text: `${label(ev.type)} excluída: ${ev.title}`, author });
  return true;
}
