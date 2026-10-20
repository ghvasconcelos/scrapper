import type { NextRequest } from "next/server";
import { createEvent, listEvents, listFollowups, validateEvent, type EventInput } from "@/lib/events";
import { addDaysISO, todayISO } from "@/lib/format";
import { author, fail, json } from "@/lib/http";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A Agenda de um período: ?from=YYYY-MM-DD&to=YYYY-MM-DD → compromissos e retornos marcados. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  let from = p.get("from") || "";
  let to = p.get("to") || "";
  if (!DATE.test(from)) from = todayISO();
  if (!DATE.test(to)) to = addDaysISO(30);
  if (from > to) [from, to] = [to, from];
  const [events, followups] = await Promise.all([listEvents(from, to), listFollowups(from, to)]);
  return json({ events, followups });
}

export async function POST(req: NextRequest) {
  const b = (await req.json()) as Partial<EventInput>;
  if (!b.starts_at) return fail("Informe a data e a hora.");
  const err = validateEvent(b);
  if (err) return fail(err);
  const event = await createEvent({
    lead_id: b.lead_id ? Number(b.lead_id) : null,
    title: (b.title || "").trim() || "Compromisso",
    type: b.type ?? "reuniao",
    starts_at: b.starts_at,
    duration_min: Math.max(5, Math.min(600, Number(b.duration_min) || 60)),
    owner: (b.owner || "").trim(),
    notes: (b.notes || "").trim(),
  }, author(req));
  return json({ event });
}
