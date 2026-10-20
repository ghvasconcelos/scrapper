import { get, run, transaction } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { listStages } from "@/lib/leads";
import type { Stage } from "@/lib/types";

export async function GET() {
  return json({ stages: await listStages() });
}

/** Rename / reorder: body is the full ordered list [{ id, name }]. */
export async function PUT(req: Request) {
  const { stages } = (await req.json()) as { stages: Pick<Stage, "id" | "name">[] };
  if (!stages?.length || stages.some((s) => !s.name?.trim())) return fail("Toda etapa precisa de um nome.");
  await transaction(async () => {
    for (const [i, s] of stages.entries()) await run("UPDATE stages SET name = ?, position = ? WHERE id = ?", s.name.trim(), i, s.id);
  });
  return json({ stages: await listStages() });
}

export async function POST(req: Request) {
  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) return fail("Dê um nome para a etapa.");
  const stages = await listStages();
  // New open stages go right before the first closing stage (Fechado/Perdido).
  const closingAt = stages.findIndex((s) => s.kind !== "open");
  const pos = closingAt === -1 ? stages.length : closingAt;
  await transaction(async () => {
    await run("UPDATE stages SET position = position + 1 WHERE position >= ?", pos);
    await run("INSERT INTO stages (name, position, kind) VALUES (?, ?, 'open')", name.trim(), pos);
  });
  return json({ stages: await listStages() });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  const all = await listStages();
  const stage = all.find((s) => s.id === id);
  if (!stage) return fail("Etapa não encontrada.", 404);
  if (stage.kind !== "open") return fail("Fechado e Perdido não podem ser removidas.");
  if (all.filter((s) => s.kind === "open").length <= 1) return fail("O funil precisa de pelo menos uma etapa aberta.");
  const n = (await get<{ n: number }>("SELECT COUNT(*)::int AS n FROM leads WHERE stage_id = ?", id))!.n;
  if (n) return fail(`Mova os ${n} leads desta etapa antes de removê-la.`);
  await run("DELETE FROM stages WHERE id = ?", id);
  return json({ stages: await listStages() });
}
