"use client";

import { useState } from "react";

/**
 * Os gráficos dos Indicadores, desenhados aqui mesmo — sem biblioteca, como
 * no ProHand: o que estas telas precisam são barras e um ranking.
 *
 * Passar o mouse mostra o valor: as barras abrem uma caixinha com o dia e o
 * valor de cada série; o ranking já mostra o número ao lado.
 */

export interface Series {
  name: string;
  values: number[];
  color: string;
}

const n = (v: number) => v.toLocaleString("pt-BR");

function Tip({ left, title, lines }: { left: number; title: string; lines: { color: string; name: string; value: string }[] }) {
  return (
    <div className="chart-tip" style={{ left: `${Math.min(90, Math.max(10, left))}%` }}>
      <b>{title}</b>
      {lines.map((l) => (
        <p key={l.name}><i style={{ background: l.color }} />{l.name}<span>{l.value}</span></p>
      ))}
    </div>
  );
}

/** Barras verticais agrupadas: uma barra por série em cada categoria. O eixo começa em zero. */
export function GroupedBars({ categories, series, height = 220, empty = "Nada no período." }: {
  categories: string[];
  series: Series[];
  height?: number;
  empty?: string;
}) {
  const [hot, setHot] = useState<number | null>(null);
  const max = Math.max(0, ...series.flatMap((s) => s.values));
  if (!categories.length || max === 0) return <p className="chart-empty">{empty}</p>;
  // rótulos do eixo: no máximo uns oito, para não colidirem
  const step = Math.ceil(categories.length / 8);
  return (
    <div className="chart">
      {series.length > 1 && (
        <div className="legend">
          {series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}
        </div>
      )}
      <div className="bars" style={{ height }} onMouseLeave={() => setHot(null)}>
        <div className="bars-grid" aria-hidden>
          {[0, 0.5, 1].map((f) => <span key={f} style={{ bottom: `${f * 100}%` }}><b>{n(Math.round(max * f))}</b></span>)}
        </div>
        <div className="bars-cats">
          {categories.map((c, i) => (
            <div key={c} className="bars-cat" data-hot={hot === i} onMouseEnter={() => setHot(i)}>
              {series.map((s) => (
                <span key={s.name} className="bar" style={{ height: `${((s.values[i] ?? 0) / max) * 100}%`, background: s.color }} />
              ))}
            </div>
          ))}
        </div>
        {hot !== null && (
          <Tip
            left={((hot + 0.5) / categories.length) * 100}
            title={categories[hot]}
            lines={series.map((s) => ({ color: s.color, name: s.name, value: n(s.values[hot] ?? 0) }))}
          />
        )}
      </div>
      <div className="bars-x" aria-hidden>
        {categories.map((c, i) => <span key={c}>{i % step === 0 ? c : ""}</span>)}
      </div>
    </div>
  );
}

/** Ranking em barras horizontais, com o valor ao lado — que é o que se quer ler. */
export function Ranking({ items, empty = "Nada no período." }: {
  items: { label: string; value: number; color?: string }[];
  empty?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length || items.every((i) => !i.value)) return <p className="chart-empty">{empty}</p>;
  return (
    <ul className="ranking">
      {items.map((i) => (
        <li key={i.label}>
          <div className="ranking-head">
            <span className="ranking-label" title={i.label}>{i.label}</span>
            <b className="num">{n(i.value)}</b>
          </div>
          <div className="ranking-track">
            <span style={{ width: `${(i.value / max) * 100}%`, background: i.color ?? "var(--brand-500)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
