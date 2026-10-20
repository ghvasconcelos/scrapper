import { money } from "./format";
import type { ContactKind, EventStatus, EventType, LogAction, Stage } from "./types";

/**
 * O que o histórico, os indicadores e a agenda mostram — sem banco, para as
 * telas importarem. As cores dos contatos foram validadas no modo escuro sobre
 * o painel (#13102f): todas passam na separação para daltonismo nesta ordem.
 */
export const CONTACT_KINDS: { kind: ContactKind; label: string; color: string }[] = [
  { kind: "whatsapp", label: "WhatsApp", color: "#24a35f" },
  { kind: "ligacao", label: "Ligação", color: "#3295c2" },
  { kind: "email", label: "E-mail", color: "#9262ff" },
  { kind: "reuniao", label: "Reunião", color: "#b8870a" },
  { kind: "instagram", label: "Instagram", color: "#c84a93" },
];

export const ACTIONS: Record<LogAction, string> = {
  criou: "Entrou",
  atualizou: "Atualizou",
  editou: "Editou",
  moveu: "Moveu",
  contatou: "Contatou",
  anotou: "Anotou",
  agendou: "Agendou",
  excluiu: "Excluiu",
};

/** Os tipos de compromisso da Agenda, com a cor de cada um na grade. */
export const EVENT_TYPES: { type: EventType; label: string; color: string }[] = [
  { type: "reuniao", label: "Reunião", color: "#8f5bff" },
  { type: "ligacao", label: "Ligação", color: "#3295c2" },
  { type: "visita", label: "Visita", color: "#b8870a" },
  { type: "tarefa", label: "Tarefa", color: "#6f68a3" },
];

export const EVENT_STATUS: Record<EventStatus, string> = {
  agendado: "Agendada",
  realizado: "Realizada",
  no_show: "Não aconteceu",
  cancelado: "Cancelada",
};

const FIELD_LABELS: Record<string, string> = {
  stage_id: "Etapa", etapa: "Etapa", owner: "Responsável", value: "Valor", next_followup: "Retorno", name: "Nome",
  phone: "Telefone", whatsapp: "WhatsApp", email: "E-mail", instagram: "Instagram", facebook: "Facebook", priority: "Prioridade",
  category: "Categoria", website: "Site", address: "Endereço", rating: "Nota", reviews: "Avaliações", needs_site: "Precisa de site",
};

export const fieldLabel = (field: string) => FIELD_LABELS[field] ?? field;

/** Um valor de campo em português: etapa pelo nome, valor em reais, data dd/mm/aaaa, vazio como "—". */
export function formatChange(field: string, v: unknown, stages: Pick<Stage, "id" | "name">[] = []): string {
  if (v === null || v === undefined || v === "") return "—";
  if (field === "stage_id") return stages.find((s) => s.id === Number(v))?.name ?? String(v);
  if (field === "value") return money(Number(v)) || "—";
  if (field === "rating") return String(v).replace(".", ",");
  const s = String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

/** "Responsável: — → Brenno · Valor: — → R$ 1.500" */
export function describeChanges(changes: Record<string, [unknown, unknown]>, stages: Pick<Stage, "id" | "name">[] = []): string {
  return Object.entries(changes)
    .map(([k, [a, b]]) => `${fieldLabel(k)}: ${formatChange(k, a, stages)} → ${formatChange(k, b, stages)}`)
    .join(" · ");
}
