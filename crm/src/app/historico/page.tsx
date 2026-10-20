"use client";

import { Eye, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useOpenLead } from "@/components/LeadDrawer";
import { PeriodPicker, type Period } from "@/components/PeriodPicker";
import { useApi } from "@/lib/client";
import { addDaysISO, dateTime, todayISO } from "@/lib/format";
import { ACTIONS, fieldLabel, formatChange } from "@/lib/log-meta";
import type { LogAction, LogEntry, Stage } from "@/lib/types";

type Page = { rows: LogEntry[]; total: number; authors: string[] };

/**
 * Histórico: tudo o que foi feito nos leads, por qualquer tela — importado,
 * contatado, movido de etapa, editado, anotado, excluído. Busca pelo lead,
 * filtro por ação, por pessoa e por período (começa nos últimos 30 dias).
 * O olho abre o detalhe: na edição, o antes → depois de cada campo.
 */
export default function HistoricoPage() {
  const openLead = useOpenLead();
  const [q, setQ] = useState("");
  const [qd, setQd] = useState(""); // a busca espera a pessoa parar de digitar
  const [action, setAction] = useState("");
  const [author, setAuthor] = useState("");
  const [period, setPeriod] = useState<Period | null>(() => ({ from: addDaysISO(-29), to: todayISO() }));
  const [detail, setDetail] = useState<LogEntry | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQd(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ ...(period && { from: period.from, to: period.to }), ...(qd && { q: qd }), ...(action && { action }), ...(author && { author }) });
  const { data, error, loading } = useApi<Page>(`/api/log?${params}`);
  const { data: meta } = useApi<{ stages: Stage[] }>("/api/meta");

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetail(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  const rows = data?.rows ?? [];
  const changes = detail ? Object.entries(detail.changes) : [];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Histórico</h1>
        <span className="sub num">{loading && !data ? "carregando…" : `${(data?.total ?? 0).toLocaleString("pt-BR")} registros`}</span>
      </div>

      <div className="filters">
        <input className="input input-search" type="search" placeholder="Pesquise pelo nome do lead…" aria-label="Pesquisar pelo lead"
          value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px" }} />
        <select className="select" aria-label="Ação" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Todas as ações</option>
          {(Object.keys(ACTIONS) as LogAction[]).map((a) => <option key={a} value={a}>{ACTIONS[a]}</option>)}
        </select>
        <select className="select" aria-label="Pessoa" value={author} onChange={(e) => setAuthor(e.target.value)}>
          <option value="">Todas as pessoas</option>
          {(data?.authors ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <PeriodPicker value={period} onChange={setPeriod} allowEmpty />
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Data</th>
                <th>Pessoa</th>
                <th>Ação</th>
                <th>Lead</th>
                <th>Detalhe</th>
                <th className="tight" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setDetail(r)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setDetail(r)}>
                  <td className="num" style={{ whiteSpace: "nowrap", color: "var(--soft)" }}>{dateTime(r.created_at)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.author || <span className="hint">—</span>}</td>
                  <td><span className={`act act-${r.action}`}>{ACTIONS[r.action] ?? r.action}</span></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {r.action === "excluiu"
                      ? <span className="hint" title="Lead excluído">{r.lead_name || "—"}</span>
                      : <button type="button" className="linkish" onClick={(e) => { e.stopPropagation(); openLead(r.lead_id); }}>{r.lead_name || `Lead ${r.lead_id}`}</button>}
                  </td>
                  <td><div className="cell-text" title={r.text}>{r.text || "—"}</div></td>
                  <td className="tight">
                    <button type="button" className="icon-link" aria-label="Ver detalhes" onClick={(e) => { e.stopPropagation(); setDetail(r); }}><Eye size={15} /></button>
                  </td>
                </tr>
              ))}
              {data && !rows.length && (
                <tr><td colSpan={6}><div className="empty"><strong>Nenhum registro nesse período</strong><span>Mude o período ou os filtros.</span></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data && data.total > rows.length && (
          <div className="table-foot">Mostrando os {rows.length} mais recentes de {data.total.toLocaleString("pt-BR")}. Refine a busca ou o período para ver o resto.</div>
        )}
      </div>

      {detail && (
        <>
          <div className="scrim" onClick={() => setDetail(null)} role="presentation" />
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="log-detail">
            <div className="modal-card">
              <div className="modal-head">
                <h2 id="log-detail"><span className={`act act-${detail.action}`}>{ACTIONS[detail.action]}</span> · {detail.lead_name || `Lead ${detail.lead_id}`}</h2>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Fechar" onClick={() => setDetail(null)}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <p className="hint">{dateTime(detail.created_at)}{detail.author ? ` · ${detail.author}` : ""}</p>
                {changes.length ? (
                  <table className="diff">
                    <thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead>
                    <tbody>
                      {changes.map(([field, [a, b]]) => (
                        <tr key={field}>
                          <td>{fieldLabel(field)}</td>
                          <td>{formatChange(field, a, meta?.stages ?? [])}</td>
                          <td>{formatChange(field, b, meta?.stages ?? [])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="tl-text">{detail.text || "Sem detalhes gravados."}</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
