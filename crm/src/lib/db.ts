import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.CRM_DB_PATH || path.join(process.cwd(), "data", "crm.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS stages (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'open'
);
CREATE TABLE IF NOT EXISTS searches (
  id INTEGER PRIMARY KEY,
  scraper_job_id TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '[]',
  city TEXT NOT NULL DEFAULT '',
  depth INTEGER NOT NULL DEFAULT 0,
  max_time INTEGER NOT NULL DEFAULT 900,
  status TEXT NOT NULL,
  found INTEGER NOT NULL DEFAULT 0,
  imported INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY,
  place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  whatsapp_source TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  facebook TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  website_kind TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  maps_link TEXT NOT NULL DEFAULT '',
  rating REAL,
  reviews INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'BAIXA',
  needs_site TEXT NOT NULL DEFAULT 'NÃO',
  site_argument TEXT NOT NULL DEFAULT '',
  marketing_arguments TEXT NOT NULL DEFAULT '[]',
  stage_id INTEGER NOT NULL REFERENCES stages(id),
  owner TEXT NOT NULL DEFAULT '',
  value REAL,
  next_followup TEXT,
  last_contact_at TEXT,
  search_id INTEGER REFERENCES searches(id) ON DELETE SET NULL,
  raw TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS leads_stage ON leads(stage_id);
CREATE INDEX IF NOT EXISTS leads_followup ON leads(next_followup);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS activities_lead ON activities(lead_id);
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  body TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lead_log (
  id INTEGER PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  lead_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT '',
  stage_to INTEGER,
  text TEXT NOT NULL DEFAULT '',
  changes TEXT NOT NULL DEFAULT '{}',
  author TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS lead_log_lead ON lead_log(lead_id);
CREATE INDEX IF NOT EXISTS lead_log_created ON lead_log(created_at);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'reuniao',
  starts_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  owner TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'agendado',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS events_start ON events(starts_at);
CREATE INDEX IF NOT EXISTS events_lead ON events(lead_id);
`;

/** Colunas que entraram depois da primeira versão: cada uma é criada se faltar. */
function migrateColumns(db: DatabaseSync) {
  const cols = (db.prepare("PRAGMA table_info(leads)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("lat")) {
    // o mapa (2026-10-07): o scraper sempre mandou latitude/longitude, mas só o `raw` guardava
    db.exec(`ALTER TABLE leads ADD COLUMN lat REAL; ALTER TABLE leads ADD COLUMN lng REAL;
      UPDATE leads SET lat = CAST(NULLIF(json_extract(raw, '$.latitude'), '') AS REAL),
                       lng = CAST(NULLIF(json_extract(raw, '$.longitude'), '') AS REAL)`);
  }
}

/**
 * O histórico (`lead_log`, 2026-10-07) é a trilha de tudo o que foi feito num
 * lead, no jeito do `logs_app` do ProHand: uma linha por mudança, com quem fez,
 * o quê e, na edição, só os campos que mudaram (antes → depois). Sem chave
 * estrangeira de propósito: o lead some, o histórico fica.
 *
 * Ele substituiu a tabela `activities`. Na primeira abertura depois da troca, o
 * que já estava lá vira linha do histórico; a tabela antiga fica, sem uso.
 */
function migrateActivities(db: DatabaseSync) {
  const stages = db.prepare("SELECT id, name FROM stages").all() as { id: number; name: string }[];
  const rows = db.prepare(`SELECT a.lead_id, a.type, a.text, a.author, a.created_at, COALESCE(l.name, '') AS lead_name
    FROM activities a LEFT JOIN leads l ON l.id = a.lead_id ORDER BY a.id`).all() as
    { lead_id: number; type: string; text: string; author: string; created_at: string; lead_name: string }[];
  const ins = db.prepare(`INSERT INTO lead_log (lead_id, lead_name, action, kind, stage_to, text, changes, author, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  db.exec("BEGIN");
  try {
    for (const r of rows) {
      let action = "contatou";
      let kind = r.type;
      let stageTo: number | null = null;
      let changes = "{}";
      if (r.type === "nota") { action = "anotou"; kind = ""; }
      else if (r.type === "sistema") {
        kind = "";
        const m = /^Etapa: (.+) → (.+)$/.exec(r.text);
        if (m) {
          action = "moveu";
          stageTo = stages.find((s) => s.name === m[2])?.id ?? null;
          changes = JSON.stringify({ etapa: [m[1], m[2]] });
        } else action = r.text.startsWith("Importado") ? "criou" : "editou";
      }
      ins.run(r.lead_id, r.lead_name, action, kind, stageTo, r.text, changes, r.author, r.created_at);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

const DEFAULT_STAGES: [string, string][] = [
  ["Novo", "open"], ["Contatado", "open"], ["Respondeu", "open"], ["Reunião", "open"],
  ["Proposta", "open"], ["Fechado", "won"], ["Perdido", "lost"],
];

const DEFAULT_TEMPLATES: [string, string][] = [
  ["Primeiro contato — site",
    "Oi, tudo bem? Aqui é {meu_nome}. Encontrei o {nome} no Google Maps e reparei que {motivo}. " +
    "A gente faz sites para {categoria} aqui em {cidade}, que ajudam a aparecer no Google e a receber pedidos direto. " +
    "Posso te mandar uma ideia de como ficaria o de vocês?"],
  ["Primeiro contato — tráfego pago",
    "Oi, tudo bem? Aqui é {meu_nome}. Vi que o {nome} tem nota {nota} no Google, ótima reputação! " +
    "Trabalho com anúncios no Instagram e no Google para {categoria} em {cidade}. " +
    "Posso te mostrar quanto daria para trazer de clientes novos por mês?"],
  ["Retorno",
    "Oi! Aqui é {meu_nome} de novo. Conseguiu ver minha mensagem sobre o {nome}? Fico à disposição para uma conversa rápida."],
];

type Global = typeof globalThis & { __crmDb?: DatabaseSync };

function open(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  migrateColumns(db);
  if (!(db.prepare("SELECT COUNT(*) AS n FROM stages").get() as { n: number }).n) {
    const ins = db.prepare("INSERT INTO stages (name, position, kind) VALUES (?, ?, ?)");
    DEFAULT_STAGES.forEach(([name, kind], i) => ins.run(name, i, kind));
  }
  if (!(db.prepare("SELECT COUNT(*) AS n FROM templates").get() as { n: number }).n) {
    const ins = db.prepare("INSERT INTO templates (name, body) VALUES (?, ?)");
    DEFAULT_TEMPLATES.forEach(([name, body]) => ins.run(name, body));
  }
  const count = (t: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  if (!count("lead_log") && count("activities")) migrateActivities(db);
  return db;
}

export function db(): DatabaseSync {
  const g = globalThis as Global;
  return (g.__crmDb ??= open());
}

export function getSetting(key: string, fallback = ""): string {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  db().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

export function transaction<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN");
  try {
    const out = fn();
    d.exec("COMMIT");
    return out;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
