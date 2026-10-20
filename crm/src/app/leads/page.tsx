"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Download, Globe, MessageCircle, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Instagram } from "@/components/brand-icons";
import { useOpenLead } from "@/components/LeadDrawer";
import { useToast } from "@/components/Toasts";
import { Due, PriorityBadge, StageBadge, Stars } from "@/components/ui";
import { api, emitChanged, useApi } from "@/lib/client";
import { shortReason, waLink } from "@/lib/format";
import type { Lead, Stage } from "@/lib/types";

type Meta = { stages: Stage[]; categories: string[]; cities: string[]; searches: { id: number; label: string; city: string }[]; team: string[] };

const FILTER_KEYS = ["q", "priority", "stage", "needs_site", "category", "search", "owner", "has_whatsapp", "has_instagram", "followup"];

function LeadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const openLead = useOpenLead();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [q, setQ] = useState(params.get("q") ?? "");

  const query = params.toString();
  const { data, loading } = useApi<{ leads: Lead[] }>(`/api/leads?${query}`);
  const { data: meta } = useApi<Meta>("/api/meta");
  const leads = useMemo(() => data?.leads ?? [], [data]);
  const stageById = useMemo(() => new Map((meta?.stages ?? []).map((s) => [s.id, s])), [meta]);
  const sort = params.get("sort") || "priority";
  const dir = params.get("dir") || "asc";

  function setParam(key: string, value: string | null) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    setSelected(new Set());
  }

  function sortBy(key: string) {
    const p = new URLSearchParams(params.toString());
    p.set("dir", sort === key && dir === "asc" ? "desc" : "asc");
    p.set("sort", key);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  const active = FILTER_KEYS.filter((k) => params.get(k));
  const allChecked = leads.length > 0 && leads.every((l) => selected.has(l.id));
  const ids = [...selected];

  async function bulk(patch: Record<string, unknown>, msg: string) {
    try {
      await api("/api/leads", { method: "PATCH", json: { ids, patch } });
      toast(msg);
      setSelected(new Set());
      emitChanged();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function remove() {
    if (!confirm(`Excluir ${ids.length} lead(s)? O histórico deles também será apagado.`)) return;
    try {
      await api("/api/leads", { method: "DELETE", json: { ids } });
      toast(`${ids.length} lead(s) excluído(s)`);
      setSelected(new Set());
      emitChanged();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  const exportHref = `/api/leads/export?${selected.size ? `ids=${ids.join(",")}&` : ""}${query}`;

  const th = (k: string, label: string) => (
    <th aria-sort={sort === k ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button onClick={() => sortBy(k)}>
        {label}
        {sort === k ? (dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} opacity={0.45} />}
      </button>
    </th>
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1>Leads</h1>
        <span className="sub num">{loading && !data ? "carregando…" : `${leads.length.toLocaleString("pt-BR")} ${leads.length === 1 ? "lead" : "leads"}`}</span>
        <span className="spacer" />
        <a className="btn" href={exportHref}><Download size={15} /> Exportar CSV</a>
        <Link href="/buscar" className="btn btn-primary"><Plus size={16} /> Nova busca</Link>
      </div>

      <div className="toolbar">
        <input className="input input-search" type="search" placeholder="Buscar nome, categoria…" value={q}
          aria-label="Buscar leads"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setParam("q", q.trim() || null)}
          onBlur={() => q.trim() !== (params.get("q") ?? "") && setParam("q", q.trim() || null)} />
        <select className="select" aria-label="Prioridade" value={params.get("priority") ?? ""} onChange={(e) => setParam("priority", e.target.value || null)}>
          <option value="">Toda prioridade</option>
          <option value="ALTA">Alta</option><option value="MÉDIA">Média</option><option value="BAIXA">Baixa</option>
        </select>
        <select className="select" aria-label="Etapa" value={params.get("stage") ?? ""} onChange={(e) => setParam("stage", e.target.value || null)}>
          <option value="">Toda etapa</option>
          {params.get("stage") === "first" && <option value="first">{meta?.stages.find((s) => s.kind === "open")?.name ?? "Novo"}</option>}
          {meta?.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select" aria-label="Precisa de site" value={params.get("needs_site") ?? ""} onChange={(e) => setParam("needs_site", e.target.value || null)}>
          <option value="">Site: todos</option>
          <option value="SIM">Precisa de site</option><option value="VERIFICAR">Verificar site</option><option value="NÃO">Tem site</option>
        </select>
        <select className="select" aria-label="Categoria" value={params.get("category") ?? ""} onChange={(e) => setParam("category", e.target.value || null)}>
          <option value="">Toda categoria</option>
          {meta?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" aria-label="Busca de origem" value={params.get("search") ?? ""} onChange={(e) => setParam("search", e.target.value || null)}>
          <option value="">Toda busca</option>
          {meta?.searches.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.city}</option>)}
        </select>
        {!!meta?.team.length && (
          <select className="select" aria-label="Responsável" value={params.get("owner") ?? ""} onChange={(e) => setParam("owner", e.target.value || null)}>
            <option value="">Todo responsável</option>
            {meta.team.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
        <label className="check"><input type="checkbox" checked={params.get("has_whatsapp") === "1"} onChange={(e) => setParam("has_whatsapp", e.target.checked ? "1" : null)} /> Com WhatsApp</label>
        <label className="check"><input type="checkbox" checked={params.get("has_instagram") === "1"} onChange={(e) => setParam("has_instagram", e.target.checked ? "1" : null)} /> Com Instagram</label>
        {active.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setQ(""); router.replace(pathname); }}>
            <X size={14} /> Limpar filtros
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="bulkbar" role="region" aria-label="Ações em massa">
          <b className="num">{selected.size} selecionado(s)</b>
          <select className="select" aria-label="Mover para etapa" value="" onChange={(e) => e.target.value && bulk({ stage_id: Number(e.target.value) }, "Etapa atualizada")}>
            <option value="">Mover para etapa…</option>
            {meta?.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {!!meta?.team.length && (
            <select className="select" aria-label="Definir responsável" value="" onChange={(e) => bulk({ owner: e.target.value === "-" ? "" : e.target.value }, "Responsável definido")}>
              <option value="">Definir responsável…</option>
              {meta.team.map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="-">Sem responsável</option>
            </select>
          )}
          <a className="btn" href={exportHref}><Download size={14} /> Exportar</a>
          <button className="btn" onClick={remove}><Trash2 size={14} /> Excluir</button>
          <button className="btn" onClick={() => setSelected(new Set())}>Cancelar</button>
        </div>
      )}

      <div className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th className="tight">
                  <input type="checkbox" className="check" aria-label="Selecionar todos" checked={allChecked}
                    onChange={() => setSelected(allChecked ? new Set() : new Set(leads.map((l) => l.id)))}
                    style={{ accentColor: "var(--violet)", width: 16, height: 16 }} />
                </th>
                {th("name", "Empresa")}
                {th("priority", "Prioridade")}
                {th("stage", "Etapa")}
                <th>Por que vender</th>
                <th>Contato</th>
                {th("reviews", "Google")}
                {th("followup", "Retorno")}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} data-selected={selected.has(l.id)} tabIndex={0} aria-label={`Abrir ${l.name}`} onClick={() => openLead(l.id)}
                  onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openLead(l.id); } }}>
                  <td className="tight" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Selecionar ${l.name}`} checked={selected.has(l.id)}
                      style={{ accentColor: "var(--violet)", width: 16, height: 16 }}
                      onChange={() => {
                        const s = new Set(selected);
                        if (s.has(l.id)) s.delete(l.id); else s.add(l.id);
                        setSelected(s);
                      }} />
                  </td>
                  <td>
                    <div className="cell-name">
                      <b>{l.name}</b>
                      <small>{l.category}{l.owner ? ` · ${l.owner}` : ""}</small>
                    </div>
                  </td>
                  <td><PriorityBadge p={l.priority} /></td>
                  <td><StageBadge stage={stageById.get(l.stage_id)} /></td>
                  <td><div className="cell-reason">{shortReason(l) || <span className="hint">—</span>}</div></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="cell-links">
                      <a className={`icon-link wa${l.whatsapp ? "" : " off"}`} href={l.whatsapp ? waLink(l.whatsapp) : undefined}
                        target="_blank" rel="noopener noreferrer" aria-label={l.whatsapp ? `WhatsApp${l.whatsapp_source === "celular" ? " (provável)" : ""}` : "Sem WhatsApp"}
                        title={l.whatsapp ? (l.whatsapp_source === "celular" ? "WhatsApp provável (celular)" : "WhatsApp confirmado") : "Sem WhatsApp"}>
                        <MessageCircle size={16} />
                      </a>
                      <a className={`icon-link ig${l.instagram ? "" : " off"}`} href={l.instagram || undefined} target="_blank"
                        rel="noopener noreferrer" aria-label={l.instagram ? "Instagram" : "Sem Instagram"} title={l.instagram ? "Instagram" : "Instagram não encontrado"}>
                        <Instagram size={16} />
                      </a>
                      <a className={`icon-link${l.website ? "" : " off"}`} href={l.website || undefined} target="_blank"
                        rel="noopener noreferrer" aria-label={l.website ? "Link do Google" : "Sem link"} title={l.website || "Sem link de site no Google"}>
                        <Globe size={16} />
                      </a>
                    </div>
                  </td>
                  <td><Stars rating={l.rating} reviews={l.reviews} /></td>
                  <td><Due iso={l.next_followup} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && leads.length === 0 && (
            <div className="empty">
              <strong>Nenhum lead encontrado</strong>
              <span>{active.length ? "Nenhum lead combina com esses filtros." : "Faça uma busca para trazer leads do Google Maps."}</span>
              {active.length
                ? <button className="btn" onClick={() => { setQ(""); router.replace(pathname); }}>Limpar filtros</button>
                : <Link href="/buscar" className="btn btn-primary"><Plus size={16} /> Buscar leads</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <LeadsPage />
    </Suspense>
  );
}
