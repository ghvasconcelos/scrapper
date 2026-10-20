"use client";

import { Star } from "lucide-react";
import { dueLabel } from "@/lib/format";
import type { NeedsSite, Priority, Stage } from "@/lib/types";

export function PriorityBadge({ p }: { p: Priority }) {
  const cls = p === "ALTA" ? "badge-alta" : p === "MÉDIA" ? "badge-media" : "badge-baixa";
  return <span className={`badge ${cls}`} title={`Prioridade ${p.toLowerCase()}`}>{p}</span>;
}

export function NeedsSiteBadge({ n }: { n: NeedsSite }) {
  if (n === "SIM") return <span className="badge badge-site">Precisa de site</span>;
  if (n === "VERIFICAR") return <span className="badge badge-check">Verificar site</span>;
  return <span className="badge badge-ok">Tem site</span>;
}

export function StageBadge({ stage }: { stage?: Stage }) {
  if (!stage) return null;
  const cls = stage.kind === "won" ? "badge-won" : stage.kind === "lost" ? "badge-lost" : "badge-stage";
  return <span className={`badge ${cls}`}>{stage.name}</span>;
}

export function Due({ iso }: { iso: string | null }) {
  const d = dueLabel(iso);
  return <span className={`due ${d.tone}`}>{d.text}</span>;
}

export function Stars({ rating, reviews }: { rating: number | null; reviews: number }) {
  if (!rating) return <span className="hint">sem nota</span>;
  return (
    <span className="stars">
      <Star size={13} fill="currentColor" strokeWidth={0} aria-hidden />
      {rating.toFixed(1).replace(".", ",")} <small>({reviews.toLocaleString("pt-BR")})</small>
    </span>
  );
}
