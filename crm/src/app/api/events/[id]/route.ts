import type { NextRequest } from "next/server";
import { deleteEvent, updateEvent, validateEvent, type EventPatch } from "@/lib/events";
import { author, fail, json } from "@/lib/http";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/events/[id]">) {
  const id = Number((await ctx.params).id);
  const b = (await req.json()) as EventPatch;
  const err = validateEvent(b);
  if (err) return fail(err);
  if (b.duration_min !== undefined) b.duration_min = Math.max(5, Math.min(600, Number(b.duration_min) || 60));
  if (b.title !== undefined) b.title = b.title.trim() || "Compromisso";
  const event = updateEvent(id, b, author(req));
  if (!event) return fail("Compromisso não encontrado.", 404);
  return json({ event });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/events/[id]">) {
  const id = Number((await ctx.params).id);
  if (!deleteEvent(id, author(req))) return fail("Compromisso não encontrado.", 404);
  return json({ ok: true });
}
