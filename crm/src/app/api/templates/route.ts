import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";
import type { Template } from "@/lib/types";

const all = () => db().prepare("SELECT id, name, body FROM templates ORDER BY id").all() as unknown as Template[];

export async function GET() {
  return json({ templates: all() });
}

export async function POST(req: Request) {
  const { name, body } = (await req.json()) as Partial<Template>;
  if (!name?.trim() || !body?.trim()) return fail("Preencha o nome e o texto do modelo.");
  db().prepare("INSERT INTO templates (name, body) VALUES (?, ?)").run(name.trim(), body.trim());
  return json({ templates: all() });
}

export async function PUT(req: Request) {
  const { id, name, body } = (await req.json()) as Partial<Template>;
  if (!id || !name?.trim() || !body?.trim()) return fail("Preencha o nome e o texto do modelo.");
  db().prepare("UPDATE templates SET name = ?, body = ? WHERE id = ?").run(name.trim(), body.trim(), id);
  return json({ templates: all() });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  db().prepare("DELETE FROM templates WHERE id = ?").run(id);
  return json({ templates: all() });
}
