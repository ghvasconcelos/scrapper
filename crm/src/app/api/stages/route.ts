import { db, transaction } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { listStages } from "@/lib/leads";
import type { Stage } from "@/lib/types";

export async function GET() {
  return json({ stages: listStages() });
}

/** Rename / reorder: body is the full ordered list [{ id, name }]. */
export async function PUT(req: Request) {
  const { stages } = (await req.json()) as { stages: Pick<Stage, "id" | "name">[] };
  if (!stages?.length || stages.some((s) => !s.name?.trim())) return fail("Toda etapa precisa de um nome.");
  transaction(() => {
    const upd = db().prepare("UPDATE stages SET name = ?, position = ? WHERE id = ?");
    stages.forEach((s, i) => upd.run(s.name.trim(), i, s.id));
  });
  return json({ stages: listStages() });
}

export async function POST(req: Request) {
  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) return fail("Dê um nome para a etapa.");
  const stages = listStages();
  // New open stages go right before the first closing stage (Fechado/Perdido).
  const closingAt = stages.findIndex((s) => s.kind !== "open");
  const pos = closingAt === -1 ? stages.length : closingAt;
  transaction(() => {
    db().prepare("UPDATE stages SET position = position + 1 WHERE position >= ?").run(pos);
    db().prepare("INSERT INTO stages (name, position, kind) VALUES (?, ?, 'open')").run(name.trim(), pos);
  });
  return json({ stages: listStages() });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  const stage = listStages().find((s) => s.id === id);
  if (!stage) return fail("Etapa não encontrada.", 404);
  if (stage.kind !== "open") return fail("Fechado e Perdido não podem ser removidas.");
  if (listStages().filter((s) => s.kind === "open").length <= 1) return fail("O funil precisa de pelo menos uma etapa aberta.");
  const n = (db().prepare("SELECT COUNT(*) AS n FROM leads WHERE stage_id = ?").get(id) as { n: number }).n;
  if (n) return fail(`Mova os ${n} leads desta etapa antes de removê-la.`);
  db().prepare("DELETE FROM stages WHERE id = ?").run(id);
  return json({ stages: listStages() });
}
