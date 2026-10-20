import { all, bestEffort, get, parseJson, run } from "./db";
import { CONTACT_KINDS } from "./log-meta";
import type { ContactKind, Dashboard, LogAction, LogEntry, Stage } from "./types";

type Row = Record<string, unknown>;

/**
 * Grava uma linha do histórico. **Nunca impede a gravação**: se falhar, só
 * avisa no console — perder o histórico é ruim, perder o que a pessoa salvou
 * é pior (a regra do log do ProHand).
 */
export async function logEvent(e: {
  leadId: number;
  leadName: string;
  action: LogAction;
  kind?: string;
  stageTo?: number | null;
  text?: string;
  changes?: Record<string, [unknown, unknown]>;
  author?: string;
}): Promise<void> {
  await bestEffort(
    () => run(`INSERT INTO lead_log (lead_id, lead_name, action, kind, stage_to, text, changes, author)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      e.leadId, e.leadName, e.action, e.kind ?? "", e.stageTo ?? null, e.text ?? "", JSON.stringify(e.changes ?? {}), e.author ?? ""),
    (err) => console.warn("lead_log:", (err as Error).message),
  );
}

function toEntry(r: Row): LogEntry {
  return { ...(r as unknown as LogEntry), changes: parseJson<LogEntry["changes"]>(r.changes, {}) };
}

export async function leadHistory(leadId: number): Promise<LogEntry[]> {
  return (await all("SELECT * FROM lead_log WHERE lead_id = ? ORDER BY created_at DESC, id DESC", leadId)).map(toEntry);
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
export async function listLog(f: LogFilters): Promise<{ rows: LogEntry[]; total: number; authors: string[] }> {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (f.q) { where.push("(lead_name ILIKE ? OR text ILIKE ?)"); args.push(`%${f.q}%`, `%${f.q}%`); }
  if (f.action) { where.push("action = ?"); args.push(f.action); }
  if (f.author) { where.push("author = ?"); args.push(f.author); }
  if (f.from) { where.push("created_at::date >= ?::date"); args.push(f.from); }
  if (f.to) { where.push("created_at::date <= ?::date"); args.push(f.to); }
  const sql = where.length ? "WHERE " + where.join(" AND ") : "";
  const [total, rows, authors] = await Promise.all([
    get<{ n: number }>(`SELECT COUNT(*)::int AS n FROM lead_log ${sql}`, ...args),
    all(`SELECT * FROM lead_log ${sql} ORDER BY created_at DESC, id DESC LIMIT ${LIMIT}`, ...args),
    all<{ author: string }>("SELECT DISTINCT author, lower(author) FROM lead_log WHERE author <> '' ORDER BY lower(author)"),
  ]);
  return { rows: rows.map(toEntry), total: total!.n, authors: authors.map((a) => a.author) };
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
export async function dashboard(from: string, to: string): Promise<Dashboard> {
  const stages = await all<Stage>("SELECT id, name, position, kind FROM stages ORDER BY position");
  const ids = (kind: string) => stages.filter((s) => s.kind === kind).map((s) => s.id).join(",") || "-1";
  const range = "created_at::date BETWEEN ?::date AND ?::date";
  const one = async (sql: string) => (await get<{ n: number }>(sql, from, to))!.n;

  const b = buckets(from, to);
  const key = b.byDay ? "to_char(created_at, 'YYYY-MM-DD')" : "to_char(created_at, 'YYYY-MM')";
  const byAuthor = (action: string) =>
    all<{ label: string; value: number }>(`SELECT COALESCE(NULLIF(author, ''), 'Sem nome') AS label, COUNT(*)::int AS value FROM lead_log
      WHERE action = ? AND ${range} GROUP BY 1 ORDER BY 2 DESC LIMIT 7`, action, from, to);

  const [entered, contacts, leadsContacted, moves, won, lost, contactRows, enteredRows, moveRows, contactsByAuthor, movesByAuthor] =
    await Promise.all([
      one(`SELECT COUNT(*)::int AS n FROM lead_log WHERE action = 'criou' AND ${range}`),
      one(`SELECT COUNT(*)::int AS n FROM lead_log WHERE action = 'contatou' AND ${range}`),
      one(`SELECT COUNT(DISTINCT lead_id)::int AS n FROM lead_log WHERE action = 'contatou' AND ${range}`),
      one(`SELECT COUNT(*)::int AS n FROM lead_log WHERE action = 'moveu' AND ${range}`),
      one(`SELECT COUNT(*)::int AS n FROM lead_log WHERE action = 'moveu' AND stage_to IN (${ids("won")}) AND ${range}`),
      one(`SELECT COUNT(*)::int AS n FROM lead_log WHERE action = 'moveu' AND stage_to IN (${ids("lost")}) AND ${range}`),
      all<{ k: string; kind: string; n: number }>(
        `SELECT ${key} AS k, kind, COUNT(*)::int AS n FROM lead_log WHERE action = 'contatou' AND ${range} GROUP BY 1, 2`, from, to),
      all<{ k: string; n: number }>(
        `SELECT ${key} AS k, COUNT(*)::int AS n FROM lead_log WHERE action = 'criou' AND ${range} GROUP BY 1`, from, to),
      all<{ stage_to: number | null; n: number }>(
        `SELECT stage_to, COUNT(*)::int AS n FROM lead_log WHERE action = 'moveu' AND ${range} GROUP BY stage_to`, from, to),
      byAuthor("contatou"),
      byAuthor("moveu"),
    ]);

  const index = new Map(b.keys.map((k, i) => [k, i]));
  const contactSeries = Object.fromEntries(CONTACT_KINDS.map((c) => [c.kind, b.keys.map(() => 0)])) as Record<ContactKind, number[]>;
  for (const r of contactRows) {
    const i = index.get(r.k);
    const series = contactSeries[r.kind as ContactKind];
    if (i !== undefined && series) series[i] = r.n;
  }
  const enteredSeries = b.keys.map(() => 0);
  for (const r of enteredRows) {
    const i = index.get(r.k);
    if (i !== undefined) enteredSeries[i] = r.n;
  }

  return {
    from, to,
    kpis: { entered, contacts, leadsContacted, moves, won, lost },
    buckets: { labels: b.labels, contacts: contactSeries, entered: enteredSeries },
    movesByStage: stages.map((s) => ({ ...s, count: moveRows.find((m) => m.stage_to === s.id)?.n ?? 0 })),
    contactsByAuthor,
    movesByAuthor,
  };
}
