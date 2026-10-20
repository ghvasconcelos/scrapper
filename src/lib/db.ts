import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";

/**
 * O banco é o Postgres do Supabase (as tabelas estão em `supabase/schema.sql`).
 * O CRM conecta direto pelo servidor com DATABASE_URL; a chave publishable do
 * Supabase não é usada, e as tabelas ficam fechadas para a API pública (RLS).
 *
 * As consultas usam `?` como antes; aqui elas viram `$1, $2...`.
 */

// Datas voltam como texto, no formato que as telas sempre usaram ("2026-10-07 14:30:00", "2026-10-07");
// ids (bigint) e contagens voltam como número.
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (v) => v);
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
pg.types.setTypeParser(pg.types.builtins.INT8, Number);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

type Global = typeof globalThis & { __crmPool?: pg.Pool };

function pool(): pg.Pool {
  const g = globalThis as Global;
  if (g.__crmPool) return g.__crmPool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada: coloque a connection string do Supabase em crm/.env.local (e nas variáveis da Vercel).");
  const conn = new URL(url);
  conn.searchParams.delete("sslmode"); // o TLS é decidido abaixo, não pela URL
  // DATABASE_CA: o certificado do Supabase (Database Settings → SSL → Download certificate), em PEM.
  // Com ele a conexão confere o servidor; sem ele fica criptografada, mas sem conferir quem responde.
  const ca = process.env.DATABASE_CA?.replace(/\\n/g, "\n");
  return (g.__crmPool = new pg.Pool({
    connectionString: conn.toString(),
    ssl: /localhost|127\.0\.0\.1/.test(conn.hostname) ? undefined : ca ? { ca } : { rejectUnauthorized: false },
    max: process.env.VERCEL ? 3 : 8,
  }));
}

/** Dentro de `transaction`, todas as consultas usam a mesma conexão. */
const tx = new AsyncLocalStorage<pg.PoolClient>();

export type Arg = string | number | boolean | null | undefined;
type Row = Record<string, unknown>;

const numbered = (sql: string) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

export async function query<T = Row>(sql: string, args: Arg[] = []): Promise<{ rows: T[]; count: number }> {
  const res = await (tx.getStore() ?? pool()).query(numbered(sql), args.map((a) => a ?? null));
  return { rows: res.rows as T[], count: res.rowCount ?? 0 };
}

export async function all<T = Row>(sql: string, ...args: Arg[]): Promise<T[]> {
  return (await query<T>(sql, args)).rows;
}

export async function get<T = Row>(sql: string, ...args: Arg[]): Promise<T | undefined> {
  return (await query<T>(sql, args)).rows[0];
}

/** Executa e devolve quantas linhas mudaram. */
export async function run(sql: string, ...args: Arg[]): Promise<number> {
  return (await query(sql, args)).count;
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (tx.getStore()) return fn();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await tx.run(client, fn);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Para o que pode falhar sem desfazer o resto (o histórico): dentro de uma
 * transação, um erro no Postgres derrubaria tudo; o savepoint isola só este passo.
 */
export async function bestEffort(fn: () => Promise<unknown>, onError: (e: unknown) => void): Promise<void> {
  const client = tx.getStore();
  try {
    if (client) await client.query("SAVEPOINT best_effort");
    await fn();
    if (client) await client.query("RELEASE SAVEPOINT best_effort");
  } catch (e) {
    if (client) await client.query("ROLLBACK TO SAVEPOINT best_effort").catch(() => {});
    onError(e);
  }
}

/** jsonb volta como objeto; texto antigo ainda é aceito. */
export function parseJson<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v !== "string") return v as T;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await get<{ value: string }>("SELECT value FROM settings WHERE key = ?", key);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  await run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", key, value);
}
