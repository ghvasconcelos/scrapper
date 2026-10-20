"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { EventDialog, type DialogInit } from "@/components/EventDialog";
import { useOpenLead } from "@/components/LeadDrawer";
import { cap } from "@/components/PeriodPicker";
import { emitChanged, useApi } from "@/lib/client";
import { todayISO } from "@/lib/format";
import { EVENT_STATUS, EVENT_TYPES } from "@/lib/log-meta";
import type { CalEvent, Followup } from "@/lib/types";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DOW1 = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MON3 = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7h às 21h
const PX_HOUR = 44; // altura de uma hora na grade da semana

const iso = (d: Date) => d.toLocaleDateString("sv-SE");
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const pad = (n: number) => String(n).padStart(2, "0");
const colorOf = (type: string) => EVENT_TYPES.find((t) => t.type === type)?.color ?? "var(--brand-500)";
const timeOf = (ev: CalEvent) => ev.starts_at.slice(11, 16);

/** As 6 semanas da grade do mês, com os dias vizinhos (o mês de 31 dias que começa no sábado precisa das 6). */
function monthGrid(ref: Date): Date[] {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
const weekOf = (ref: Date): Date[] => {
  const sun = addDays(ref, -ref.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(sun, i));
};

type Day = { events: CalEvent[]; followups: Followup[] };

function EventChip({ ev, onOpen }: { ev: CalEvent; onOpen: (ev: CalEvent) => void }) {
  return (
    <button type="button" className="chip-ev" data-status={ev.status} style={{ "--c": colorOf(ev.type) } as React.CSSProperties}
      title={`${ev.title}${ev.lead_name ? ` · ${ev.lead_name}` : ""} · ${EVENT_STATUS[ev.status]}`}
      onClick={(e) => { e.stopPropagation(); onOpen(ev); }}>
      <b>{timeOf(ev)}</b> {ev.title}
    </button>
  );
}

function FollowupChip({ f, onOpen }: { f: Followup; onOpen: (id: number) => void }) {
  return (
    <button type="button" className="chip-ev chip-fu" title={`Retorno marcado · ${f.name}`} onClick={(e) => { e.stopPropagation(); onOpen(f.lead_id); }}>
      Retorno · {f.name}
    </button>
  );
}

/**
 * Agenda, no jeito da Agenda do CRM do ProHand: mini calendário e o dia
 * escolhido à esquerda; à direita a grade do mês (sempre 6 semanas) ou a
 * semana por hora. Clicar num dia vazio marca ali; clicar num compromisso
 * abre para editar ou dar o resultado. Os retornos marcados nos leads
 * aparecem junto, como item do dia.
 */
export default function AgendaPage() {
  const openLead = useOpenLead();
  const today = todayISO();
  const [ref, setRef] = useState(() => parse(today));
  const [mode, setMode] = useState<"mes" | "semana">("mes");
  const [selected, setSelected] = useState(today);
  const [dialog, setDialog] = useState<DialogInit | null>(null);

  // sempre carrega as 6 semanas do mês de `ref`: cobre a semana mostrada e os pontinhos do mini calendário
  const grid = useMemo(() => monthGrid(ref), [ref]);
  const { data, reload } = useApi<{ events: CalEvent[]; followups: Followup[] }>(`/api/events?from=${iso(grid[0])}&to=${iso(grid[41])}`);
  const byDay = useMemo(() => {
    const m = new Map<string, Day>();
    const get = (k: string) => { let d = m.get(k); if (!d) { d = { events: [], followups: [] }; m.set(k, d); } return d; };
    for (const e of data?.events ?? []) get(e.starts_at.slice(0, 10)).events.push(e);
    for (const f of data?.followups ?? []) get(f.date).followups.push(f);
    return m;
  }, [data]);

  const days = mode === "mes" ? grid : weekOf(ref);
  const move = (n: number) => setRef(mode === "mes" ? new Date(ref.getFullYear(), ref.getMonth() + n, 1) : addDays(ref, 7 * n));
  const title = mode === "mes"
    ? `${cap(MONTHS[ref.getMonth()])} de ${ref.getFullYear()}`
    : `${days[0].getDate()} ${MON3[days[0].getMonth()]} – ${days[6].getDate()} ${MON3[days[6].getMonth()]} ${days[6].getFullYear()}`;
  const sel = byDay.get(selected);
  const selDate = parse(selected);
  const saved = () => { reload(); emitChanged(); };
  const openEvent = (ev: CalEvent) => setDialog({ event: ev });

  return (
    <div className="page">
      <div className="page-head">
        <h1>Agenda</h1>
        <span className="sub">reuniões e retornos marcados</span>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={() => setDialog({ date: selected })}><Plus size={16} /> Nova reunião</button>
      </div>

      <div className="agenda">
        <aside className="stack">
          <div className="panel mini">
            <div className="mini-head">
              <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Mês anterior" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}><ChevronLeft size={15} /></button>
              <span>{cap(MONTHS[ref.getMonth()])} {ref.getFullYear()}</span>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Mês seguinte" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))}><ChevronRight size={15} /></button>
            </div>
            <div className="mini-grid">
              {DOW1.map((d, i) => <b key={i} aria-hidden>{d}</b>)}
              {grid.map((d) => {
                const k = iso(d);
                return (
                  <button key={k} type="button" className="mini-day" data-out={d.getMonth() !== ref.getMonth()} data-today={k === today} data-selected={k === selected}
                    aria-label={d.toLocaleDateString("pt-BR")} onClick={() => { setSelected(k); if (mode === "semana") setRef(d); }}>
                    {d.getDate()}{byDay.has(k) && <i aria-hidden />}
                  </button>
                );
              })}
            </div>
          </div>

          <section className="panel">
            <div className="panel-head"><h2>{cap(selDate.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long" }))}</h2></div>
            {sel && (sel.events.length || sel.followups.length) ? (
              <ul className="rows">
                {sel.followups.map((f) => (
                  <li key={`f${f.lead_id}`} className="row-item" tabIndex={0} role="button" onClick={() => openLead(f.lead_id)} onKeyDown={(e) => e.key === "Enter" && openLead(f.lead_id)}>
                    <div className="row-title"><i className="dot-ev dot-fu" aria-hidden /><span className="name">{f.name}</span></div>
                    <div className="row-sub">Retorno marcado{f.owner ? ` · ${f.owner}` : ""}</div>
                  </li>
                ))}
                {sel.events.map((ev) => (
                  <li key={ev.id} className="row-item" tabIndex={0} role="button" onClick={() => openEvent(ev)} onKeyDown={(e) => e.key === "Enter" && openEvent(ev)}>
                    <div className="row-title"><i className="dot-ev" style={{ background: colorOf(ev.type) }} aria-hidden /><span className="name">{ev.title}</span></div>
                    <div className="row-sub">{timeOf(ev)} · {ev.duration_min} min{ev.lead_name ? ` · ${ev.lead_name}` : ""}{ev.owner ? ` · ${ev.owner}` : ""}</div>
                    <div className="row-side"><span className="badge badge-outline">{EVENT_STATUS[ev.status]}</span></div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">
                <span>Nada marcado neste dia.</span>
                <button className="btn btn-sm" onClick={() => setDialog({ date: selected })}><Plus size={14} /> Marcar</button>
              </div>
            )}
          </section>
        </aside>

        <section className="panel">
          <div className="cal-head">
            <button className="btn btn-sm" onClick={() => { setRef(parse(today)); setSelected(today); }}>Hoje</button>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Anterior" onClick={() => move(-1)}><ChevronLeft size={15} /></button>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Seguinte" onClick={() => move(1)}><ChevronRight size={15} /></button>
            <h2>{title}</h2>
            <span className="spacer" />
            <div className="seg" role="group" aria-label="Modo">
              <button aria-pressed={mode === "mes"} onClick={() => setMode("mes")}>Mês</button>
              <button aria-pressed={mode === "semana"} onClick={() => { setMode("semana"); setRef(parse(selected)); }}>Semana</button>
            </div>
          </div>

          {mode === "mes" ? (
            <div className="cal-grid">
              {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
              {grid.map((d) => {
                const k = iso(d);
                const items = byDay.get(k);
                const fus = items?.followups ?? [];
                const evs = items?.events ?? [];
                const n = fus.length + evs.length;
                const shownFu = fus.slice(0, 3);
                const shownEv = evs.slice(0, Math.max(0, 3 - shownFu.length));
                return (
                  <div key={k} className="cal-cell" data-out={d.getMonth() !== ref.getMonth()} data-today={k === today} data-selected={k === selected}
                    onClick={() => setSelected(k)} onDoubleClick={() => setDialog({ date: k })}>
                    <div className="cal-num">
                      <i>{d.getDate()}</i>
                      <button type="button" className="cal-add" aria-label={`Marcar no dia ${d.getDate()}`} onClick={(e) => { e.stopPropagation(); setDialog({ date: k }); }}><Plus size={13} /></button>
                    </div>
                    {shownFu.map((f) => <FollowupChip key={`f${f.lead_id}`} f={f} onOpen={openLead} />)}
                    {shownEv.map((ev) => <EventChip key={ev.id} ev={ev} onOpen={openEvent} />)}
                    {n > 3 && <span className="cal-more">+{n - 3}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="week">
              <div className="week-corner" />
              {days.map((d) => {
                const k = iso(d);
                return <div key={k} className="week-dow" data-today={k === today}>{DOW[d.getDay()]}<b>{d.getDate()}</b></div>;
              })}
              <div className="week-corner week-label">retornos</div>
              {days.map((d) => {
                const k = iso(d);
                return <div key={k} className="week-allday">{byDay.get(k)?.followups.map((f) => <FollowupChip key={f.lead_id} f={f} onOpen={openLead} />)}</div>;
              })}
              <div className="week-hours">{HOURS.map((h) => <div key={h} className="week-hour">{pad(h)}:00</div>)}</div>
              {days.map((d) => {
                const k = iso(d);
                return (
                  <div key={k} className="week-col" style={{ height: HOURS.length * PX_HOUR }}
                    onClick={(e) => {
                      const h = Math.min(21, 7 + Math.floor(e.nativeEvent.offsetY / PX_HOUR));
                      setSelected(k);
                      setDialog({ date: k, time: `${pad(h)}:00` });
                    }}>
                    {byDay.get(k)?.events.map((ev) => {
                      const [h, m] = timeOf(ev).split(":").map(Number);
                      if (h < 7 || h > 21) return null; // fora da grade: continua no mês e na lista do dia
                      const top = (((h - 7) * 60 + m) / 60) * PX_HOUR;
                      const height = Math.max(22, (ev.duration_min / 60) * PX_HOUR);
                      return (
                        <button key={ev.id} type="button" className="week-ev" data-status={ev.status} style={{ top, height, "--c": colorOf(ev.type) } as React.CSSProperties}
                          title={`${ev.title}${ev.lead_name ? ` · ${ev.lead_name}` : ""} · ${EVENT_STATUS[ev.status]}`} onClick={(e) => { e.stopPropagation(); openEvent(ev); }}>
                          <b>{timeOf(ev)}</b> {ev.title}{ev.lead_name && <small>{ev.lead_name}</small>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {dialog && <EventDialog init={dialog} onClose={() => setDialog(null)} onSaved={saved} />}
    </div>
  );
}
