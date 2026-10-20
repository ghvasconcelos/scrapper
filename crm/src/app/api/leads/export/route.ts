import type { NextRequest } from "next/server";
import { listLeads, listStages } from "@/lib/leads";

const COLS: [string, (l: ReturnType<typeof listLeads>[number], stage: string) => string | number | null][] = [
  ["Prioridade", (l) => l.priority], ["Nome", (l) => l.name], ["Categoria", (l) => l.category],
  ["Etapa", (_l, s) => s], ["Precisa de site?", (l) => l.needs_site], ["Argumento - Site", (l) => l.site_argument],
  ["Argumentos - Marketing/Tráfego pago", (l) => l.marketing_arguments.join("; ")],
  ["Telefone", (l) => l.phone], ["WhatsApp", (l) => l.whatsapp],
  ["Origem WhatsApp", (l) => (l.whatsapp_source === "site" ? "confirmado (link)" : l.whatsapp_source === "celular" ? "provável (celular)" : "")],
  ["E-mail", (l) => l.email], ["Instagram", (l) => l.instagram], ["Facebook", (l) => l.facebook],
  ["Link de site no Google", (l) => l.website], ["Endereço", (l) => l.address], ["Cidade", (l) => l.city],
  ["Nota", (l) => l.rating], ["Avaliações", (l) => l.reviews], ["Responsável", (l) => l.owner],
  ["Valor (R$)", (l) => l.value], ["Próximo contato", (l) => l.next_followup], ["Google Maps", (l) => l.maps_link],
];

const cell = (v: string | number | null) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const ids = (p.get("ids") || "").split(",").map(Number).filter(Boolean);
  const stages = new Map(listStages().map((s) => [s.id, s.name]));
  let leads = listLeads({
    q: p.get("q") || undefined, priority: p.get("priority") || undefined, stage: p.get("stage") || undefined,
    needs_site: p.get("needs_site") || undefined, category: p.get("category") || undefined,
    search: p.get("search") || undefined, has_whatsapp: p.get("has_whatsapp") === "1",
    has_instagram: p.get("has_instagram") === "1",
  });
  if (ids.length) leads = leads.filter((l) => ids.includes(l.id));
  const lines = [COLS.map(([h]) => h).join(","),
    ...leads.map((l) => COLS.map(([, f]) => cell(f(l, stages.get(l.stage_id) ?? ""))).join(","))];
  const date = new Date().toLocaleDateString("sv-SE");
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${date}.csv"`,
    },
  });
}
