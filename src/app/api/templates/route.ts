import { all as rows, run } from "@/lib/db";
import { fail, json } from "@/lib/http";
import type { Template } from "@/lib/types";

const all = () => rows<Template>("SELECT id, name, body FROM templates ORDER BY id");

export async function GET() {
  return json({ templates: await all() });
}

export async function POST(req: Request) {
  const { name, body } = (await req.json()) as Partial<Template>;
  if (!name?.trim() || !body?.trim()) return fail("Preencha o nome e o texto do modelo.");
  await run("INSERT INTO templates (name, body) VALUES (?, ?)", name.trim(), body.trim());
  return json({ templates: await all() });
}

export async function PUT(req: Request) {
  const { id, name, body } = (await req.json()) as Partial<Template>;
  if (!id || !name?.trim() || !body?.trim()) return fail("Preencha o nome e o texto do modelo.");
  await run("UPDATE templates SET name = ?, body = ? WHERE id = ?", name.trim(), body.trim(), id);
  return json({ templates: await all() });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  await run("DELETE FROM templates WHERE id = ?", id);
  return json({ templates: await all() });
}
