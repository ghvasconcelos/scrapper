"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOpenLead } from "@/components/LeadDrawer";
import { PeriodPicker, type Period } from "@/components/PeriodPicker";
import { useApi } from "@/lib/client";
import { stageColor } from "@/lib/format";
import type { Lead, Stage } from "@/lib/types";

type Meta = { stages: Stage[]; categories: string[]; team: string[]; searches: { id: number; label: string; city: string }[] };

// tiles do OpenStreetMap (sem chave); o escuro vem de um filtro de CSS no `.map` — os do CARTO passaram a exigir chave
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const EMPTY = { priority: "", stage: "", needs_site: "", category: "", search: "", owner: "", has_whatsapp: false, has_instagram: false };

/**
 * Mapa: cada lead é um ponto na cor da etapa dele, no lugar que o Google Maps
 * informou. Os filtros são os mesmos da tela de Leads; clicar no ponto abre a
 * ficha. O mapa se ajusta ao que os filtros deixaram.
 */
export default function MapaPage() {
  const openLead = useOpenLead();
  const [q, setQ] = useState("");
  const [qd, setQd] = useState("");
  const [f, setF] = useState(EMPTY);
  const [period, setPeriod] = useState<Period | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQd(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ sort: "name" });
  if (qd) params.set("q", qd);
  for (const [k, v] of Object.entries(f)) if (v) params.set(k, v === true ? "1" : String(v));
  if (period) { params.set("from", period.from); params.set("to", period.to); }
  const { data, loading } = useApi<{ leads: Lead[] }>(`/api/leads?${params}`);
  const { data: meta } = useApi<Meta>("/api/meta");
  const leads = useMemo(() => data?.leads ?? [], [data]);
  const located = useMemo(() => leads.filter((l) => l.lat !== null && l.lng !== null), [leads]);
  const stages = useMemo(() => meta?.stages ?? [], [meta]);
  const active = Object.values(f).some(Boolean) || !!qd || !!period;
  const set = (k: keyof typeof EMPTY, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  // o Leaflet mexe no `window` ao carregar: entra só no navegador, depois de montar
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const mod = await import("leaflet");
      const lib = ((mod as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet;
      if (!alive || !el.current) return;
      const m = lib.map(el.current, { center: [-15.8, -47.9], zoom: 4 });
      lib.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 }).addTo(m);
      L.current = lib;
      map.current = m;
      layer.current = lib.layerGroup().addTo(m);
      setReady(true);
    })();
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const lib = L.current, m = map.current, g = layer.current;
    if (!ready || !lib || !m || !g) return;
    g.clearLayers();
    const pts: [number, number][] = [];
    for (const l of located) {
      const s = stages.find((x) => x.id === l.stage_id);
      const pt: [number, number] = [l.lat!, l.lng!];
      lib.circleMarker(pt, { radius: 7, weight: 1.5, color: "#08071a", fillColor: stageColor(s?.position ?? 0, s?.kind ?? "open"), fillOpacity: 0.92 })
        .bindTooltip(`<b>${esc(l.name)}</b><br>${esc(l.category)}${s ? ` · ${esc(s.name)}` : ""}`, { direction: "top", offset: [0, -8] })
        .on("click", () => openLead(l.id))
        .addTo(g);
      pts.push(pt);
    }
    if (pts.length) m.fitBounds(lib.latLngBounds(pts).pad(0.15), { maxZoom: 15 });
  }, [located, stages, ready, openLead]);

  const legend = stages.map((s) => ({ s, n: located.filter((l) => l.stage_id === s.id).length })).filter((x) => x.n > 0);
  const missing = leads.length - located.length;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Mapa</h1>
        <span className="sub num">
          {loading && !data ? "carregando…" : `${located.length} ${located.length === 1 ? "lead" : "leads"} no mapa${missing ? ` · ${missing} sem localização` : ""}`}
        </span>
      </div>

      <div className="filters">
        <input className="input input-search" type="search" placeholder="Pesquise pelo nome, categoria…" aria-label="Pesquisar leads"
          value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 200px" }} />
        <PeriodPicker value={period} onChange={setPeriod} allowEmpty prefix="Entraram" emptyLabel="em qualquer data" />
        <select className="select" aria-label="Etapa" value={f.stage} onChange={(e) => set("stage", e.target.value)}>
          <option value="">Toda etapa</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select" aria-label="Prioridade" value={f.priority} onChange={(e) => set("priority", e.target.value)}>
          <option value="">Toda prioridade</option>
          <option value="ALTA">Alta</option><option value="MÉDIA">Média</option><option value="BAIXA">Baixa</option>
        </select>
        <select className="select" aria-label="Precisa de site" value={f.needs_site} onChange={(e) => set("needs_site", e.target.value)}>
          <option value="">Site: todos</option>
          <option value="SIM">Precisa de site</option><option value="VERIFICAR">Verificar site</option><option value="NÃO">Tem site</option>
        </select>
        <select className="select" aria-label="Categoria" value={f.category} onChange={(e) => set("category", e.target.value)}>
          <option value="">Toda categoria</option>
          {meta?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" aria-label="Busca de origem" value={f.search} onChange={(e) => set("search", e.target.value)}>
          <option value="">Toda busca</option>
          {meta?.searches.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.city}</option>)}
        </select>
        {!!meta?.team.length && (
          <select className="select" aria-label="Responsável" value={f.owner} onChange={(e) => set("owner", e.target.value)}>
            <option value="">Todo responsável</option>
            {meta.team.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
        <label className="check"><input type="checkbox" checked={f.has_whatsapp} onChange={(e) => set("has_whatsapp", e.target.checked)} /> Com WhatsApp</label>
        <label className="check"><input type="checkbox" checked={f.has_instagram} onChange={(e) => set("has_instagram", e.target.checked)} /> Com Instagram</label>
        {active && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setQ(""); setQd(""); setF(EMPTY); setPeriod(null); }}><X size={14} /> Limpar</button>
        )}
      </div>

      <div ref={el} className="map" role="application" aria-label="Mapa dos leads" />

      <div className="stagelegend">
        {legend.map(({ s, n }) => (
          <span key={s.id}><i style={{ background: stageColor(s.position, s.kind) }} />{s.name} <b className="num">{n}</b></span>
        ))}
        {!loading && !located.length && <span className="hint">Nenhum lead com localização para estes filtros.</span>}
      </div>
    </div>
  );
}
