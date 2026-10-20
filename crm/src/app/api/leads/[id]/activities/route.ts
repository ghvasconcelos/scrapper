import type { NextRequest } from "next/server";
import { leadDetail } from "@/lib/detail";
import { author, fail, json } from "@/lib/http";
import { getLead, registerContact, type Loggable } from "@/lib/leads";

const TYPES: Loggable[] = ["nota", "whatsapp", "ligacao", "instagram", "email", "reuniao"];

/**
 * Registra um contato ou uma nota. Contato também tira o lead de "Novo" e
 * marca o próximo retorno quando não há nenhum (ver `registerContact`).
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/leads/[id]/activities">) {
  const id = Number((await ctx.params).id);
  if (!getLead(id)) return fail("Lead não encontrado.", 404);
  const { type, text, followupDays } = (await req.json()) as { type: Loggable; text?: string; followupDays?: number };
  if (!TYPES.includes(type)) return fail("Tipo de atividade inválido.");
  if (type === "nota" && !text?.trim()) return fail("Escreva a nota antes de salvar.");
  registerContact(id, type, (text || "").trim(), author(req), followupDays);
  return json(leadDetail(id));
}
