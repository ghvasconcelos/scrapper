export type Priority = "ALTA" | "MÉDIA" | "BAIXA";
export type NeedsSite = "SIM" | "VERIFICAR" | "NÃO";
export type StageKind = "open" | "won" | "lost";

export interface Stage {
  id: number;
  name: string;
  position: number;
  kind: StageKind;
}

export interface Lead {
  id: number;
  place_id: string | null;
  name: string;
  category: string;
  phone: string;
  whatsapp: string;
  whatsapp_source: "" | "site" | "celular";
  email: string;
  instagram: string;
  facebook: string;
  website: string;
  website_kind: string;
  address: string;
  city: string;
  maps_link: string;
  rating: number | null;
  reviews: number;
  priority: Priority;
  needs_site: NeedsSite;
  site_argument: string;
  marketing_arguments: string[];
  stage_id: number;
  owner: string;
  value: number | null;
  next_followup: string | null; // YYYY-MM-DD
  last_contact_at: string | null;
  lat: number | null; // do Google Maps, para o mapa
  lng: number | null;
  search_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  lead_id: number;
  type: "nota" | "whatsapp" | "ligacao" | "instagram" | "email" | "reuniao" | "sistema";
  text: string;
  author: string;
  created_at: string;
}

export type SearchStatus = "running" | "importing" | "done" | "failed";

export interface Search {
  id: number;
  scraper_job_id: string;
  label: string;
  keywords: string[];
  city: string;
  depth: number;
  max_time: number; // segundos
  status: SearchStatus;
  found: number;
  imported: number;
  updated: number;
  progress: number; // websites checked while importing
  error: string;
  created_at: string;
  finished_at: string | null;
}

export interface Template {
  id: number;
  name: string;
  body: string;
}

export type LogAction = "criou" | "atualizou" | "editou" | "moveu" | "contatou" | "anotou" | "agendou" | "excluiu";

export type EventType = "reuniao" | "ligacao" | "visita" | "tarefa";
export type EventStatus = "agendado" | "realizado" | "no_show" | "cancelado";

/** Um compromisso da Agenda (lib/events.ts): reunião, ligação, visita ou tarefa, quase sempre ligado a um lead. */
export interface CalEvent {
  id: number;
  lead_id: number | null;
  lead_name: string;
  title: string;
  type: EventType;
  starts_at: string; // "YYYY-MM-DD HH:MM", hora local
  duration_min: number;
  owner: string;
  notes: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

/** Um retorno marcado num lead (next_followup), que a Agenda mostra como item do dia. */
export interface Followup {
  lead_id: number;
  name: string;
  date: string;
  owner: string;
}
export type ContactKind = "whatsapp" | "ligacao" | "email" | "instagram" | "reuniao";

/** Uma linha do histórico: tudo o que foi feito num lead (lib/log.ts). */
export interface LogEntry {
  id: number;
  lead_id: number;
  lead_name: string; // copiado: o nome muda, o histórico não
  action: LogAction;
  kind: string; // contatou: o tipo do contato
  stage_to: number | null; // moveu: a etapa de destino
  text: string;
  changes: Record<string, [unknown, unknown]>; // editou/moveu: {campo: [antes, depois]}
  author: string;
  created_at: string;
}

/** O que a tela de Indicadores recebe para um período (lib/log.ts). */
export interface Dashboard {
  from: string;
  to: string;
  kpis: { entered: number; contacts: number; leadsContacted: number; moves: number; won: number; lost: number };
  buckets: { labels: string[]; contacts: Record<ContactKind, number[]>; entered: number[] };
  movesByStage: (Stage & { count: number })[];
  contactsByAuthor: { label: string; value: number }[];
  movesByAuthor: { label: string; value: number }[];
}
