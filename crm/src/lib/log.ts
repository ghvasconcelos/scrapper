import { db } from "./db";
import { CONTACT_KINDS } from "./log-meta";
import type { ContactKind, Dashboard, LogAction, LogEntry, Stage } from "./types";

type Row = Record<string, unknown>;

/**
 * Grava uma linha do histórico. **Nunca impede a gravação**: se falhar, só
 * avisa no console — perder o histórico é ruim, perder o que a pessoa salvou
 * é pior (a regra do log do ProHand).
 */
export function logEvent(e: {
  leadId: number;
  leadName: string;
  action: LogAction;
  kind?: string;
  stageTo?: number | null;
  text?: string;
  changes?: Record<string, [unknown, unknown]>;
  author?: string;
}): void {
  try {
    db().prepare(`INSERT INTO lead_log (lead_id, lead_name, action, kind, stage_to, text, changes, author, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))`)
      .run(e.leadId, e.leadName, e.action, e.kind ?? "", e.stageTo ?? null, e.text ?? "", JSON.stringify(e.changes ?? {}), e.author ?? "");
  } catch (err) {
    console.warn("lead_log:", (err as Error).message);
  }
}

function toEntry(r: Row): LogEntry {
  let changes: LogEntry["changes"] = {};
  try { changes = JSON.parse((r.changes as string) || "{}"); } catch { /* linha antiga ou corrompida: sem detalhe */ }
  return { ...(r as unknown as LogEntry), changes };
}

export function leadHistory(leadId: number): LogEntry[] {
  return (db().prepare("SELECT * FROM lead_log WHERE lead_id = ? ORDER BY created_at DESC, id DESC").all(leadId) as Row[]).map(toEntry);
}

export interface LogFilters {
  q?: string;
  action?: string;
  author?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
}

const LIMIT = 300;

/** A tela de Histórico: as linhas mais novas primeiro, até 300, com o total e quem já aparece no histórico. */
export function listLog(f: LogFilters): { rows: LogEntry[]; total: number; authors: string[] } {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (f.q) { where.push("(lead_name LIKE ? OR text LIKE ?)"); args.push(`%${f.q}%`, `%${f.q}%`); }
  if (f.action) { where.push("action = ?"); args.push(f.action); }
  if (f.author) { where.push("author = ?"); args.push(f.author); }
  if (f.from) { where.push("date(created_at) >= ?"); args.push(f.from); }
  if (f.to) { where.push("date(created_at) <= ?"); args.push(f.to); }
  const sql = where.length ? "WHERE " + where.join(" AND ") : "";
  const d = db();
  const total = (d.prepare(`SELECT COUNT(*) AS n FROM lead_log ${sql}`).get(...args) as { n: number }).n;
  const rows = (d.prepare(`SELECT * FROM lead_log ${sql} ORDER BY created_at DESC, id DESC LIMIT ${LIMIT}`).all(...args) as Row[]).map(toEntry);
  const authors = (d.prepare("SELECT DISTINCT author FROM lead_log WHERE author <> '' ORDER BY author COLLATE NOCASE").all() as { author: string }[])
    .map((a) => a.author);
  return { rows, total, authors };
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Os intervalos do gráfico: um por dia até 45 dias; acima disso, um por mês. */
function buckets(from: string, to: string): { keys: string[]; labels: string[]; byDay: boolean } {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const keys: string[] = [];
  const labels: string[] = [];
  if (days <= 45) {
    for (let i = 0; i < days; i++) {
      const d = new Date(fy, fm - 1, fd + i);
      keys.push(d.toLocaleDateString("sv-SE"));
      labels.push(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return { keys, labels, byDay: true };
  }
  for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, m = 1) : m++) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    labels.push(`${MONTHS[m - 1]}/${String(y).slice(2)}`);
  }
  return { keys, labels, byDay: false };
}

/** Os números dos Indicadores num período: tudo sai do histórico. */
export function dashboard(from: string, to: string): Dashboard {
  const d = db();
  const stages = d.prepare("SELECT id, name, position, kind FROM stages ORDER BY position").all() as unknown as Stage[];
  const ids = (kind: string) => stages.filter((s) => s.kind === kind).map((s) => s.id).join(",") || "-1";
  const range = "date(created_at) BETWEEN ? AND ?";
  const one = (sql: string) => (d.prepare(sql).get(from, to) as { n: number }).n;

  const kpis = {
    entered: one(`SELECT COUNT(*) AS n FROM lead_log WHERE action = 'criou' AND ${range}`),
    contacts: one(`SELECT COUNT(*) AS n FROM lead_log WHERE action = 'contatou' AND ${range}`),
    leadsContacted: one(`SELECT COUNT(DISTINCT lead_id) AS n FROM lead_log WHERE action = 'contatou' AND ${range}`),
    moves: one(`SELECT COUNT(*) AS n FROM lead_log WHERE action = 'moveu' AND ${range}`),
    won: one(`SELECT COUNT(*) AS n FROM lead_log WHERE action = 'moveu' AND stage_to IN (${ids("won")}) AND ${range}`),
    lost: one(`SELECT COUNT(*) AS n FROM lead_log WHERE action = 'moveu' AND stage_to IN (${ids("lost")}) AND ${range}`),
  };

  const b = buckets(from, to);
  const key = b.byDay ? "date(created_at)" : "strftime('%Y-%m', created_at)";
  const index = new Map(b.keys.map((k, i) => [k, i]));
  const contacts = Object.fromEntries(CONTACT_KINDS.map((c) => [c.kind, b.keys.map(() => 0)])) as Record<ContactKind, number[]>;
  for (const r of d.prepare(`SELECT ${key} AS k, kind, COUNT(*) AS n FROM lead_log WHERE action = 'contatou' AND ${range} GROUP BY k, kind`)
    .all(from, to) as { k: string; kind: string; n: number }[]) {
    const i = index.get(r.k);
    const series = contacts[r.kind as ContactKind];
    if (i !== undefined && series) series[i] = r.n;
  }
  const entered = b.keys.map(() => 0);
  for (const r of d.prepare(`SELECT ${key} AS k, COUNT(*) AS n FROM lead_log WHERE action = 'criou' AND ${range} GROUP BY k`)
    .all(from, to) as { k: string; n: number }[]) {
    const i = index.get(r.k);
    if (i !== undefined) entered[i] = r.n;
  }

  const moves = d.prepare(`SELECT stage_to, COUNT(*) AS n FROM lead_log WHERE action = 'moveu' AND ${range} GROUP BY stage_to`)
    .all(from, to) as { stage_to: number | null; n: number }[];
  const movesByStage = stages.map((s) => ({ ...s, count: moves.find((m) => m.stage_to === s.id)?.n ?? 0 }));

  const byAuthor = (action: string) =>
    (d.prepare(`SELECT COALESCE(NULLIF(author, ''), 'Sem nome') AS label, COUNT(*) AS value FROM lead_log
      WHERE action = ? AND ${range} GROUP BY label ORDER BY value DESC LIMIT 7`).all(action, from, to) as { label: string; value: number }[]);

  return {
    from, to, kpis,
    buckets: { labels: b.labels, contacts, entered },
    movesByStage,
    contactsByAuthor: byAuthor("contatou"),
    movesByAuthor: byAuthor("moveu"),
  };
}
