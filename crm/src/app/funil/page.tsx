"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Instagram } from "@/components/brand-icons";
import { useOpenLead } from "@/components/LeadDrawer";
import { useToast } from "@/components/Toasts";
import { Due, PriorityBadge } from "@/components/ui";
import { api, emitChanged, useApi } from "@/lib/client";
import { money, shortReason, stageColor } from "@/lib/format";
import type { Lead, Stage } from "@/lib/types";

const CARD_LIMIT = 150;

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

/**
 * Funil do topo, como no CRM do ProHand: um quadrado por etapa e, entre cada
 * par, a conversão de uma etapa para a seguinte. Lê a base inteira
 * (`/api/stats`), não o resultado dos filtros do kanban.
 */
function Funnel() {
  const { data } = useApi<{ byStage: (Stage & { count: number; total: number })[] }>("/api/stats", { pollMs: 60_000 });
  const steps = (data?.byStage ?? []).filter((s) => s.kind !== "lost");
  if (!steps.length) return null;
  return (
    <div className="funnel" role="group" aria-label="Funil por etapa">
      {steps.map((s, i) => {
        const prev = steps[i - 1];
        const rate = prev && prev.count > 0 ? Math.round((s.count / prev.count) * 100) : null;
        return (
          <div key={s.id} className="funnel-step">
            {rate !== null && (
              <span className="funnel-rate" title={`${s.count} de ${prev.count}: de ${prev.name} para ${s.name}`}>{rate}%</span>
            )}
            <div className="funnel-box" style={{ "--c": stageColor(s.position, s.kind) } as React.CSSProperties}>
              <b className="num">{s.count}</b>
              <span title={s.total > 0 ? money(s.total) : undefined}>{s.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FunnelPage() {
  const openLead = useOpenLead();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("");
  const [owner, setOwner] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  // Fade the right edge while more stages are hidden off-screen.
  const board = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const measure = useCallback(() => {
    const b = board.current;
    if (b) setMore(b.scrollLeft + b.clientWidth < b.scrollWidth - 4);
  }, []);
  useEffect(() => {
    const b = board.current;
    if (!b) return;
    const ro = new ResizeObserver(measure);
    ro.observe(b);
    return () => ro.disconnect();
  }, [measure]);
  // Columns arrive after the stages load, without resizing the board itself.
  useEffect(() => {
    const r = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(r);
  });

  const query = new URLSearchParams({ sort: "priority", ...(priority && { priority }), ...(owner && { owner }), ...(q && { q }) });
  const { data, setData } = useApi<{ leads: Lead[] }>(`/api/leads?${query}`);
  const { data: meta } = useApi<{ stages: Stage[]; team: string[] }>("/api/meta");

  const byStage = useMemo(() => {
    const m = new Map<number, Lead[]>();
    for (const l of data?.leads ?? []) m.set(l.stage_id, [...(m.get(l.stage_id) ?? []), l]);
    return m;
  }, [data]);

  async function move(leadId: number, stage: Stage) {
    const lead = data?.leads.find((l) => l.id === leadId);
    if (!lead || lead.stage_id === stage.id || !data) return;
    setData({ leads: data.leads.map((l) => (l.id === leadId ? { ...l, stage_id: stage.id } : l)) }); // optimistic
    try {
      await api(`/api/leads/${leadId}`, { method: "PATCH", json: { stage_id: stage.id } });
      toast(`${lead.name} → ${stage.name}`);
      emitChanged();
    } catch (e) {
      setData(data);
      toast((e as Error).message, true);
    }
  }

  // Copia o número em vez de abrir o WhatsApp: o vendedor cola no WhatsApp que já está aberto (ProHand).
  async function copyPhone(l: Lead, digits: string) {
    try {
      await navigator.clipboard.writeText(digits);
      setCopied(l.id);
      setTimeout(() => setCopied((c) => (c === l.id ? null : c)), 1500);
    } catch {
      toast("Não consegui copiar o número", true);
    }
  }

  return (
    <div className="page" style={{ paddingBottom: 16 }}>
      <Funnel />

      <div className="page-head">
        <h1>Funil</h1>
        <span className="sub">arraste os cards entre as etapas</span>
        <span className="spacer" />
        <div className="toolbar">
          <input className="input input-search" type="search" placeholder="Pesquise pelo nome do lead…" aria-label="Filtrar por nome"
            value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
          <select className="select" aria-label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Toda prioridade</option>
            <option value="ALTA">Alta</option><option value="MÉDIA">Média</option><option value="BAIXA">Baixa</option>
          </select>
          {!!meta?.team.length && (
            <select className="select" aria-label="Responsável" value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Todo responsável</option>
              {meta.team.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="board" ref={board} data-more={more} data-dragging={dragId !== null} onScroll={measure}>
        {meta?.stages.map((s) => {
          const cards = byStage.get(s.id) ?? [];
          const total = cards.reduce((a, l) => a + (l.value ?? 0), 0);
          return (
            <section
              key={s.id}
              className="col"
              aria-label={`${s.name}: ${cards.length} leads`}
              data-over={over === s.id}
              onDragOver={(e) => { e.preventDefault(); if (over !== s.id) setOver(s.id); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = Number(e.dataTransfer.getData("text/plain"));
                if (id) void move(id, s);
              }}
            >
              <div className="col-head">
                <i style={{ background: stageColor(s.position, s.kind) }} aria-hidden />
                <h3>{s.name}</h3>
              </div>
              <div className="col-meta">
                <span className="sum">{total > 0 ? money(total) : "—"}</span>
                <span className="n">({cards.length})</span>
              </div>
              <div className="col-cards">
                {cards.slice(0, CARD_LIMIT).map((l) => {
                  const digits = (l.whatsapp || l.phone).replace(/\D/g, "");
                  const hasPhone = digits.length >= 10; // DDD + número
                  return (
                    <article
                      key={l.id}
                      className="card"
                      draggable
                      tabIndex={0}
                      data-dragging={dragId === l.id}
                      onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(l.id)); e.dataTransfer.effectAllowed = "move"; setDragId(l.id); }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                      onClick={() => openLead(l.id)}
                      onKeyDown={(e) => e.key === "Enter" && openLead(l.id)}
                      aria-label={l.name}
                    >
                      <div className="card-top">
                        <span className="card-name">{l.name}</span>
                        {hasPhone && (
                          <button
                            type="button"
                            className="card-copy"
                            draggable={false}
                            onClick={(e) => { e.stopPropagation(); void copyPhone(l, digits); }}
                            aria-label={`Copiar o número de ${l.name}`}
                            title={copied === l.id ? "Número copiado!" : "Copiar o número"}
                          >
                            {copied === l.id ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        )}
                      </div>
                      <span className="card-sub">{l.category}{l.city ? ` · ${l.city}` : ""}</span>
                      {l.value ? <span className="card-value">{money(l.value)}</span> : null}
                      {s.kind === "open" && shortReason(l) && <span className="card-reason">{shortReason(l)}</span>}
                      <div className="card-foot">
                        {l.owner && <span className="card-owner" title={`Responsável: ${l.owner}`}>{initials(l.owner)}</span>}
                        {l.next_followup && <Due iso={l.next_followup} />}
                        <span className="spacer" />
                        {l.instagram && <Instagram size={14} className="ig-mark" />}
                        <PriorityBadge p={l.priority} />
                      </div>
                    </article>
                  );
                })}
                {cards.length > CARD_LIMIT && (
                  <span className="hint" style={{ textAlign: "center" }}>+{cards.length - CARD_LIMIT} leads: use os filtros para ver</span>
                )}
                {cards.length === 0 && <div className="col-empty">Arraste leads para cá</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
