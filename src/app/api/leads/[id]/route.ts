import type { NextRequest } from "next/server";
import { leadDetail } from "@/lib/detail";
import { author, fail, json } from "@/lib/http";
import { updateLead, type LeadPatch } from "@/lib/leads";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const id = Number((await ctx.params).id);
  const detail = await leadDetail(id);
  if (!detail) return fail("Lead não encontrado.", 404);
  return json(detail);
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const id = Number((await ctx.params).id);
  const patch = (await req.json()) as LeadPatch;
  if (!(await updateLead(id, patch, author(req)))) return fail("Lead não encontrado.", 404);
  return json(await leadDetail(id));
}
