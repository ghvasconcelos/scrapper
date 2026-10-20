import type { NextRequest } from "next/server";
import { author, fail, json } from "@/lib/http";
import { deleteLeads, firstStageId, listLeads, updateLead, type LeadFilters, type LeadPatch } from "@/lib/leads";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const f: LeadFilters = {
    q: p.get("q") || undefined,
    priority: p.get("priority") || undefined,
    stage: p.get("stage") === "first" ? String(await firstStageId()) : p.get("stage") || undefined,
    needs_site: p.get("needs_site") || undefined,
    category: p.get("category") || undefined,
    search: p.get("search") || undefined,
    city: p.get("city") || undefined,
    owner: p.get("owner") || undefined,
    has_whatsapp: p.get("has_whatsapp") === "1",
    has_instagram: p.get("has_instagram") === "1",
    followup: (p.get("followup") as LeadFilters["followup"]) || undefined,
    from: p.get("from") || undefined,
    to: p.get("to") || undefined,
  };
  const dir = p.get("dir") === "desc" ? "desc" : "asc";
  return json({ leads: await listLeads(f, p.get("sort") || "priority", dir) });
}

/** Bulk edit: { ids: number[], patch: { stage_id?, owner?, priority? } } */
export async function PATCH(req: Request) {
  const { ids, patch } = (await req.json()) as { ids?: number[]; patch?: LeadPatch };
  if (!ids?.length || !patch) return fail("Informe os leads e o que alterar.");
  const who = author(req);
  for (const id of ids) await updateLead(id, patch, who);
  return json({ ok: true, count: ids.length });
}

export async function DELETE(req: Request) {
  const { ids } = (await req.json()) as { ids?: number[] };
  if (!ids?.length) return fail("Nenhum lead selecionado.");
  return json({ deleted: await deleteLeads(ids, author(req)) });
}
