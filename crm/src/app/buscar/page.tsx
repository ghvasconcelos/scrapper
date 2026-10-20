"use client";

import { CircleAlert, CircleCheck, Download, LoaderCircle, Plus, Radar, Trash2, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/Toasts";
import { api, emitChanged, useApi } from "@/lib/client";
import { dateTime } from "@/lib/format";
import type { Search } from "@/lib/types";

const PRESETS: { name: string; terms: string[] }[] = [
  { name: "Gastronomia", terms: ["restaurantes", "lanchonetes", "pizzarias", "hamburguerias", "padarias", "cafeterias", "bares", "comida japonesa", "açaí", "sorveterias"] },
  { name: "Saúde", terms: ["dentistas", "clínicas médicas", "fisioterapia", "psicólogos", "nutricionistas", "clínicas veterinárias", "laboratórios"] },
  { name: "Beleza e estética", terms: ["salões de beleza", "barbearias", "clínicas de estética", "manicure", "depilação", "maquiadoras"] },
  { name: "Fitness", terms: ["academias", "crossfit", "studios de pilates", "escolas de dança", "artes marciais"] },
  { name: "Serviços", terms: ["advogados", "contabilidade", "imobiliárias", "autoescolas", "escolas de idiomas", "gráficas"] },
  { name: "Casa e auto", terms: ["oficinas mecânicas", "lava-jato", "auto peças", "lojas de materiais de construção", "móveis planejados", "vidraçarias"] },
  { name: "Comércio", terms: ["pet shops", "lojas de roupas", "óticas", "floriculturas", "farmácias", "lojas de celulares"] },
];

const SCOPES = [
  { depth: 1, label: "Rápida", per: 20, hint: "~20 lugares por tipo" },
  { depth: 2, label: "Normal", per: 40, hint: "~40 lugares por tipo" },
  { depth: 5, label: "Ampla", per: 90, hint: "~90 lugares por tipo" },
  { depth: 10, label: "Máxima", per: 160, hint: "~160 lugares por tipo" },
];

type Payload = {
  searches: Search[];
  external: { id: string; name: string; date: string; status: string; keywords: string[] }[];
  scraperOk: boolean;
};

function StatusCell({ s }: { s: Search }) {
  if (s.status === "running") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span className="status"><LoaderCircle size={14} className="spin" /> Buscando no Google Maps…</span>
        <div className="progress indeterminate"><span /></div>
      </div>
    );
  }
  if (s.status === "importing") {
    const pct = s.found ? Math.round((s.progress / s.found) * 100) : 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span className="status"><LoaderCircle size={14} className="spin" /> Analisando sites <span className="num">{s.progress}/{s.found}</span></span>
        <div className="progress"><span style={{ transform: `scaleX(${pct / 100})` }} /></div>
      </div>
    );
  }
  if (s.status === "done") return <span className="status" style={{ color: "var(--green)" }}><CircleCheck size={14} /> Concluída</span>;
  return <span className="status" style={{ color: "var(--red)" }}><CircleAlert size={14} /> Falhou</span>;
}

export default function SearchPage() {
  const toast = useToast();
  const [terms, setTerms] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [city, setCity] = useState("");
  const [depth, setDepth] = useState(2);
  const [email, setEmail] = useState(true);
  const [radius, setRadius] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { data, reload } = useApi<Payload>("/api/searches", { pollMs: 4000 });
  const scope = SCOPES.find((s) => s.depth === depth)!;
  const estimate = terms.length * scope.per;
  const minutes = Math.max(2, Math.round((terms.length * depth * (email ? 45 : 15)) / 60));
  const heavy = terms.length >= 8 || depth >= 5;

  const toggle = (t: string) => setTerms((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  function addCustom() {
    const parts = custom.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (parts.length) setTerms((cur) => [...cur, ...parts.filter((p) => !cur.includes(p))]);
    setCustom("");
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/searches", { method: "POST", json: { terms, city, depth, email, radiusKm: radius } });
      toast("Busca iniciada. Os leads entram no CRM sozinhos quando ela terminar.");
      setTerms([]);
      void reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importJob(id: string) {
    try {
      await api("/api/searches/import", { method: "POST", json: { jobId: id } });
      toast("Importação iniciada");
      void reload();
    } catch (err) {
      toast((err as Error).message, true);
    }
  }

  async function removeSearch(id: number) {
    await api(`/api/searches?id=${id}`, { method: "DELETE" });
    void reload();
    emitChanged();
  }

  const searches = data?.searches ?? [];
  const external = (data?.external ?? []).filter((j) => j.status === "ok");

  return (
    <div className="page">
      <div className="page-head">
        <h1>Buscar leads</h1>
        <span className="sub">no Google Maps, direto para o funil</span>
      </div>

      {data && !data.scraperOk && (
        <div className="error-box">
          <CircleAlert size={16} />
          <span>O scraper não está respondendo. Abra o <b>Docker Desktop</b> e espere o motor iniciar; o scraper sobe sozinho junto.</span>
        </div>
      )}

      <div className="search-layout">
        <form className="panel" onSubmit={start}>
          <div className="panel-head"><h2>Nova busca</h2></div>
          <div className="panel-body form">
            <div className="field">
              <label htmlFor="city">Cidade</label>
              <input id="city" className="input" placeholder="Ex.: Anápolis, GO" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>

            <div className="field">
              <span className="label">Tipos de negócio</span>
              {terms.length > 0 ? (
                <div className="chips">
                  {terms.map((t) => (
                    <button type="button" key={t} className="chip" aria-pressed="true" onClick={() => toggle(t)} aria-label={`Remover ${t}`}>
                      {t} <span className="x"><X size={13} /></span>
                    </button>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTerms([])}>Limpar</button>
                </div>
              ) : (
                <span className="hint">Escolha nos grupos abaixo ou escreva os seus.</span>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input className="input" style={{ flex: 1 }} placeholder="Outro tipo (ex.: floriculturas, chaveiros)" value={custom}
                  aria-label="Adicionar tipo de negócio"
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} />
                <button type="button" className="btn" onClick={addCustom} disabled={!custom.trim()}><Plus size={15} /> Adicionar</button>
              </div>
            </div>

            {PRESETS.map((g) => {
              const all = g.terms.every((t) => terms.includes(t));
              return (
                <div key={g.name} className="preset-group">
                  <div className="preset-head">
                    <span className="label">{g.name}</span>
                    <button type="button" className="btn btn-ghost btn-sm"
                      onClick={() => setTerms((cur) => (all ? cur.filter((t) => !g.terms.includes(t)) : [...cur, ...g.terms.filter((t) => !cur.includes(t))]))}>
                      {all ? "Desmarcar todos" : "Marcar todos"}
                    </button>
                  </div>
                  <div className="chips">
                    {g.terms.map((t) => (
                      <button type="button" key={t} className="chip" aria-pressed={terms.includes(t)} onClick={() => toggle(t)}>{t}</button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="field">
              <span className="label">Abrangência</span>
              <div className="seg" role="group" aria-label="Abrangência">
                {SCOPES.map((s) => (
                  <button type="button" key={s.depth} aria-pressed={depth === s.depth} onClick={() => setDepth(s.depth)}>{s.label}</button>
                ))}
              </div>
              <span className="hint">{scope.hint}. Mais abrangência traz mais leads, mas demora mais.</span>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="field">
                <label htmlFor="radius">Raio (km)</label>
                <input id="radius" className="input num" type="number" min={1} max={50} value={radius} style={{ width: 90 }}
                  onChange={(e) => setRadius(Number(e.target.value) || 10)} />
              </div>
              <label className="check" style={{ paddingBottom: 8 }}>
                <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Procurar e-mails nos sites
              </label>
            </div>

            <div className="launch">
              {terms.length > 0 && (
                <div className="estimate">
                  <span>Até <b className="num">~{estimate.toLocaleString("pt-BR")}</b> lugares em {terms.length} {terms.length === 1 ? "tipo" : "tipos"} de negócio.</span>
                  <span className="hint">Leva uns {minutes} min. Você pode sair desta tela: a importação continua sozinha.</span>
                </div>
              )}
              {heavy && (
                <div className="warn">
                  <TriangleAlert size={15} />
                  <span>Busca grande. Fazer várias assim em seguida pode fazer o Google bloquear seu IP por algumas horas (as buscas voltam vazias). Para volume alto e frequente, use proxies.</span>
                </div>
              )}
              {error && <div className="error-box"><CircleAlert size={16} /> {error}</div>}

              <button type="submit" className="btn btn-primary" disabled={busy || !terms.length || !city.trim()} style={{ height: 38 }}>
                {busy ? <><LoaderCircle size={16} className="spin" /> Iniciando…</> : <><Radar size={16} /> Iniciar busca</>}
              </button>
            </div>
          </div>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <section className="panel">
            <div className="panel-head"><h2>Buscas</h2><span className="spacer" /><span className="meta">atualiza sozinho</span></div>
            {searches.length ? (
              <div className="table-wrap" style={{ maxHeight: "none" }}>
                <table className="data">
                  <thead>
                    <tr><th>Busca</th><th>Status</th><th>Encontrados</th><th>Novos</th><th>Já existiam</th><th className="tight" /></tr>
                  </thead>
                  <tbody>
                    {searches.map((s) => (
                      <tr key={s.id} style={{ cursor: "default" }}>
                        <td>
                          <div className="cell-name">
                            <b>{s.label}</b>
                            <small>{s.city} · {dateTime(s.created_at)}</small>
                          </div>
                          {s.error && <div className="hint" style={{ color: s.status === "failed" ? "var(--red)" : "var(--amber)", maxWidth: 360, whiteSpace: "normal" }}>{s.error}</div>}
                        </td>
                        <td><StatusCell s={s} /></td>
                        <td className="num">{s.found || "—"}</td>
                        <td className="num">{s.status === "done" ? <b>{s.imported}</b> : "—"}</td>
                        <td className="num">{s.status === "done" ? s.updated : "—"}</td>
                        <td className="tight">
                          <div style={{ display: "flex", gap: 4 }}>
                            {s.status === "done" && <Link className="btn btn-sm" href={`/leads?search=${s.id}`}>Ver leads</Link>}
                            {(s.status === "done" || s.status === "failed") && (
                              <button className="btn btn-sm btn-ghost btn-icon" aria-label="Remover do histórico" title="Remover do histórico (os leads continuam)"
                                onClick={() => removeSearch(s.id)}><Trash2 size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <Radar size={24} aria-hidden />
                <strong>Nenhuma busca ainda</strong>
                <span>Escolha a cidade e os tipos de negócio ao lado.</span>
              </div>
            )}
          </section>

          {external.length > 0 && (
            <section className="panel">
              <div className="panel-head">
                <h2>Buscas do scraper fora do CRM</h2>
                <span className="meta">feitas pelo terminal ou pela tela do scraper</span>
              </div>
              <ul className="rows">
                {external.map((j) => (
                  <li key={j.id} className="row-item" style={{ cursor: "default" }}>
                    <div className="row-title"><span className="name">{j.keywords.slice(0, 3).join(", ") || j.name}{j.keywords.length > 3 ? ` e mais ${j.keywords.length - 3}` : ""}</span></div>
                    <div className="row-sub">{dateTime(j.date)}</div>
                    <div className="row-side">
                      <button className="btn btn-sm" onClick={() => importJob(j.id)}><Download size={14} /> Importar para o CRM</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
