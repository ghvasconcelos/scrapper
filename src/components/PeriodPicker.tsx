"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { addDaysISO, todayISO } from "@/lib/format";

/**
 * O seletor de período do app, no desenho do `PeriodoInput` do ProHand: um
 * campo só ("de – até") que abre um balão com os atalhos à esquerda e o
 * calendário à direita, onde se clica no início e depois no fim. Substitui
 * os dois campos de data nativos, que abriam um calendário cada um e fora do
 * visual do app.
 */

export interface Period { from: string; to: string } // YYYY-MM-DD

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DOW = ["D", "S", "T", "Q", "Q", "S", "S"];

const iso = (d: Date) => d.toLocaleDateString("sv-SE");
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
/** "setembro de 2026" → "Setembro de 2026" (o `capitalize` do CSS também subia o "De"). */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "2026-10-07" → "07/10/2026" */
export const br = (s: string) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };

export function presets(): { id: string; label: string; period: Period }[] {
  const today = todayISO();
  const t = parse(today);
  return [
    { id: "7", label: "7 dias", period: { from: addDaysISO(-6), to: today } },
    { id: "30", label: "30 dias", period: { from: addDaysISO(-29), to: today } },
    { id: "mes", label: "Este mês", period: { from: iso(new Date(t.getFullYear(), t.getMonth(), 1)), to: today } },
    { id: "passado", label: "Mês passado", period: { from: iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)), to: iso(new Date(t.getFullYear(), t.getMonth(), 0)) } },
  ];
}

/** Fecha o balão ao clicar fora ou apertar Esc. */
function useOutside(open: boolean, box: React.RefObject<HTMLDivElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("mousedown", onDoc); window.removeEventListener("keydown", onKey, true); };
  }, [open, box, close]);
}

/** As 6 semanas de um mês, com os dias vizinhos. */
function CalendarGrid({ shown, onShown, isEdge, isIn, onPick }: {
  shown: Date;
  onShown: (d: Date) => void;
  isEdge: (k: string) => boolean;
  isIn: (k: string) => boolean;
  onPick: (k: string) => void;
}) {
  const today = todayISO();
  const first = new Date(shown.getFullYear(), shown.getMonth(), 1);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  return (
    <div className="period-cal">
      <div className="period-nav">
        <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Mês anterior" onClick={() => onShown(new Date(shown.getFullYear(), shown.getMonth() - 1, 1))}><ChevronLeft size={15} /></button>
        <span>{cap(MONTHS[shown.getMonth()])} de {shown.getFullYear()}</span>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Mês seguinte" onClick={() => onShown(new Date(shown.getFullYear(), shown.getMonth() + 1, 1))}><ChevronRight size={15} /></button>
      </div>
      <div className="period-grid">
        {DOW.map((d, i) => <b key={i} aria-hidden>{d}</b>)}
        {days.map((d) => {
          const k = iso(d);
          return (
            <button key={k} type="button" className="period-day" data-out={d.getMonth() !== shown.getMonth()} data-today={k === today}
              data-in={isIn(k)} data-edge={isEdge(k)} aria-label={br(k)} onClick={() => onPick(k)}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PeriodPicker({ value, onChange, allowEmpty, emptyLabel = "Todo o período", prefix }: {
  value: Period | null;
  onChange: (p: Period | null) => void;
  /** Mostra o atalho "Todo o período" (o valor vira null). */
  allowEmpty?: boolean;
  emptyLabel?: string;
  /** Um rótulo antes das datas, ex.: "Entraram em". */
  prefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<string | null>(null); // o início já clicado, esperando o fim
  const [shown, setShown] = useState(() => parse(value?.from ?? todayISO()));
  // qual atalho foi clicado: no dia 7, "7 dias" e "Este mês" dão o mesmo intervalo, e só o clicado fica marcado
  const [chosen, setChosen] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const close = () => { setOpen(false); setPicking(null); };
  useOutside(open, box, close);

  // abre sempre no mês em que o período começa (ProHand, relato #33)
  const toggle = () => {
    if (open) return close();
    setShown(parse(value?.from ?? todayISO()));
    setPicking(null);
    setOpen(true);
  };
  const pick = (k: string) => {
    if (!picking) return setPicking(k);
    const [a, b] = k < picking ? [k, picking] : [picking, k];
    onChange({ from: a, to: b });
    setChosen(null);
    close();
  };
  const same = (p: Period) => !!value && value.from === p.from && value.to === p.to;
  const all = presets();
  const pressed = (id: string, p: Period) => same(p) && (chosen && all.some((x) => x.id === chosen && same(x.period)) ? chosen === id : all.find((x) => same(x.period))?.id === id);
  const label = value ? `${br(value.from)} – ${br(value.to)}` : emptyLabel;

  return (
    <div className="period" ref={box}>
      <button type="button" className="period-btn" aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <CalendarDays size={15} aria-hidden />
        {prefix && <span className="period-prefix">{prefix}</span>}
        <span className="num">{label}</span>
      </button>
      {open && (
        <div className="period-pop" role="dialog" aria-label="Escolher período">
          <div className="period-presets">
            {all.map((p) => (
              <button key={p.id} type="button" aria-pressed={pressed(p.id, p.period)} onClick={() => { onChange(p.period); setChosen(p.id); close(); }}>{p.label}</button>
            ))}
            {allowEmpty && <button type="button" aria-pressed={value === null} onClick={() => { onChange(null); setChosen(null); close(); }}>{emptyLabel}</button>}
            <p className="hint">{picking ? `Início ${br(picking)}. Agora clique no fim.` : "No calendário: clique no início e depois no fim."}</p>
          </div>
          <CalendarGrid
            shown={shown}
            onShown={setShown}
            isEdge={(k) => (picking ? k === picking : !!value && (k === value.from || k === value.to))}
            isIn={(k) => !picking && !!value && k > value.from && k < value.to}
            onPick={pick}
          />
        </div>
      )}
    </div>
  );
}

/** Uma data só, com o mesmo calendário. */
export function DatePicker({ value, onChange, id }: { value: string; onChange: (d: string) => void; id?: string }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(() => parse(value || todayISO()));
  const box = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useOutside(open, box, close);
  return (
    <div className="period" ref={box}>
      <button id={id} type="button" className="period-btn" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => { if (!open) setShown(parse(value || todayISO())); setOpen(!open); }}>
        <CalendarDays size={15} aria-hidden />
        <span className="num">{value ? br(value) : "Escolher data"}</span>
      </button>
      {open && (
        <div className="period-pop" role="dialog" aria-label="Escolher data">
          <CalendarGrid shown={shown} onShown={setShown} isEdge={(k) => k === value} isIn={() => false} onPick={(k) => { onChange(k); close(); }} />
        </div>
      )}
    </div>
  );
}
