"use client";

import { Check, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, useApi, useCurrentUser } from "@/lib/client";
import { todayISO } from "@/lib/format";
import { EVENT_STATUS, EVENT_TYPES } from "@/lib/log-meta";
import type { CalEvent, EventStatus, EventType, Lead } from "@/lib/types";
import { DatePicker } from "./PeriodPicker";
import { useToast } from "./Toasts";

/** Como a popup abre: um compromisso existente, ou um novo já com dia/hora/lead. */
export interface DialogInit {
  event?: CalEvent;
  date?: string;
  time?: string;
  lead?: { id: number; name: string };
}

const DURATIONS = [15, 30, 45, 60, 90, 120];
// de 15 em 15 minutos, das 7h às 21h45: quem digita horário errado era o problema do campo livre
const TIMES = Array.from({ length: 60 }, (_, i) => `${String(7 + Math.floor(i / 4)).padStart(2, "0")}:${["00", "15", "30", "45"][i % 4]}`);

/**
 * A popup do compromisso, como a PopupEvento da Agenda do ProHand: marcar,
 * editar, remarcar e dar o resultado (realizada, não aconteceu, cancelada).
 */
export function EventDialog({ init, onClose, onSaved }: { init: DialogInit; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const me = useCurrentUser();
  const ev = init.event;
  const { data: meta } = useApi<{ team: string[] }>("/api/meta");
  const [lead, setLead] = useState<{ id: number; name: string } | null>(
    ev ? (ev.lead_id ? { id: ev.lead_id, name: ev.lead_name } : null) : (init.lead ?? null),
  );
  const [leadQ, setLeadQ] = useState("");
  const [title, setTitle] = useState(ev?.title ?? "");
  const [type, setType] = useState<EventType>(ev?.type ?? "reuniao");
  const [date, setDate] = useState(ev?.starts_at.slice(0, 10) ?? init.date ?? todayISO());
  const [time, setTime] = useState(ev?.starts_at.slice(11, 16) ?? init.time ?? "10:00");
  const [duration, setDuration] = useState(ev?.duration_min ?? 60);
  const [owner, setOwner] = useState(ev?.owner ?? me);
  const [notes, setNotes] = useState(ev?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const q = leadQ.trim();
  const { data: found } = useApi<{ leads: Lead[] }>(q.length >= 2 ? `/api/leads?q=${encodeURIComponent(q)}&sort=name` : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const label = EVENT_TYPES.find((t) => t.type === type)?.label ?? "Compromisso";
  const team = meta?.team ?? [];
  const times = TIMES.includes(time) ? TIMES : [time, ...TIMES];

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      onSaved();
      onClose();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  const save = () => run(() => {
    const body = {
      lead_id: lead?.id ?? null,
      title: title.trim() || (lead ? `${label} com ${lead.name}` : label),
      type, starts_at: `${date} ${time}`, duration_min: duration, owner, notes: notes.trim(),
    };
    return ev ? api(`/api/events/${ev.id}`, { method: "PATCH", json: body }) : api("/api/events", { method: "POST", json: body });
  }, ev ? "Compromisso salvo" : `${label} marcada`);
  const setStatus = (status: EventStatus) => run(() => api(`/api/events/${ev!.id}`, { method: "PATCH", json: { status } }), EVENT_STATUS[status]);
  const remove = () => { if (confirm("Excluir este compromisso?")) void run(() => api(`/api/events/${ev!.id}`, { method: "DELETE" }), "Compromisso excluído"); };

  return (
    <>
      <div className="scrim scrim-top" onClick={onClose} role="presentation" />
      <div className="modal top">
        <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="ev-title">
          <div className="modal-head">
            <h2 id="ev-title">{ev ? ev.title : `Marcar ${label.toLowerCase()}`}</h2>
            {ev && <span className="badge badge-outline">{EVENT_STATUS[ev.status]}</span>}
            <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Fechar" onClick={onClose}><X size={16} /></button>
          </div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="field span2">
                <label htmlFor="ev-lead">Lead</label>
                {lead ? (
                  <div className="picked">
                    <span>{lead.name}</span>
                    {!ev && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLead(null)}>Trocar</button>}
                  </div>
                ) : (
                  <div className="suggest-box">
                    <input id="ev-lead" className="input input-search" placeholder="Pesquise pelo nome do lead…" value={leadQ}
                      onChange={(e) => setLeadQ(e.target.value)} autoFocus autoComplete="off" />
                    {q.length >= 2 && found && (
                      <div className="suggest">
                        {found.leads.slice(0, 8).map((l) => (
                          <button key={l.id} type="button" onClick={() => { setLead({ id: l.id, name: l.name }); setLeadQ(""); }}>
                            {l.name}<small>{l.category}{l.city ? ` · ${l.city}` : ""}</small>
                          </button>
                        ))}
                        {!found.leads.length && <p className="hint" style={{ padding: "8px 12px" }}>Nenhum lead com esse nome.</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="field span2">
                <label htmlFor="ev-t">Título</label>
                <input id="ev-t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={lead ? `${label} com ${lead.name}` : label} />
              </div>
              <div className="field">
                <label htmlFor="ev-type">Tipo</label>
                <select id="ev-type" className="select" value={type} onChange={(e) => setType(e.target.value as EventType)}>
                  {EVENT_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ev-owner">Responsável</label>
                <select id="ev-owner" className="select" value={owner} onChange={(e) => setOwner(e.target.value)}>
                  <option value="">Sem responsável</option>
                  {team.map((n) => <option key={n} value={n}>{n}</option>)}
                  {owner && !team.includes(owner) && <option value={owner}>{owner}</option>}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ev-date">Data</label>
                <DatePicker id="ev-date" value={date} onChange={setDate} />
              </div>
              <div className="field">
                <label htmlFor="ev-time">Hora e duração</label>
                <div className="actions" style={{ flexWrap: "nowrap" }}>
                  <select id="ev-time" className="select" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: 110 }}>
                    {times.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="select" aria-label="Duração" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                    {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>
              <div className="field span2">
                <label htmlFor="ev-notes">Observações</label>
                <textarea id="ev-notes" className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal-foot">
            {ev && (ev.status === "agendado" ? (
              <>
                <button className="btn" disabled={busy} onClick={() => setStatus("realizado")}><Check size={15} /> Realizada</button>
                <button className="btn" disabled={busy} onClick={() => setStatus("no_show")}>Não aconteceu</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => setStatus("cancelado")}>Cancelada</button>
              </>
            ) : (
              <button className="btn btn-ghost" disabled={busy} onClick={() => setStatus("agendado")}>Voltar para agendada</button>
            ))}
            {ev && <button className="btn btn-ghost btn-danger btn-icon" disabled={busy} onClick={remove} aria-label="Excluir compromisso" title="Excluir"><Trash2 size={15} /></button>}
            <span className="spacer" />
            <button className="btn" onClick={onClose} disabled={busy}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
          </div>
        </div>
      </div>
    </>
  );
}
