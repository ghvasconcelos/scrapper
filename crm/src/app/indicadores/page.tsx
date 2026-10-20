"use client";

import { ArrowRightLeft, MessageCircle, Trophy, UserPlus } from "lucide-react";
import { useState } from "react";
import { GroupedBars, Ranking } from "@/components/charts";
import { PeriodPicker, type Period } from "@/components/PeriodPicker";
import { useApi } from "@/lib/client";
import { addDaysISO, stageColor, todayISO } from "@/lib/format";
import { CONTACT_KINDS } from "@/lib/log-meta";
import type { Dashboard } from "@/lib/types";

/**
 * Indicadores: o que a equipe fez no período. Tudo sai do histórico
 * (`lead_log`), não da foto atual dos leads — por isso conta o que foi feito
 * no período, mesmo que o lead já tenha mudado de novo.
 */
export default function IndicadoresPage() {
  const [period, setPeriod] = useState<Period>(() => ({ from: addDaysISO(-29), to: todayISO() }));
  const { data, error } = useApi<Dashboard>(`/api/dashboard?from=${period.from}&to=${period.to}`);
  const k = data?.kpis;
  const byMonth = !!data && data.buckets.labels.length > 45;
  const contactSeries = CONTACT_KINDS.map((c) => ({ name: c.label, color: c.color, values: data?.buckets.contacts[c.kind] ?? [] }));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Indicadores</h1>
        <span className="sub">o que a equipe fez no período</span>
      </div>

      <div className="filters">
        <PeriodPicker value={period} onChange={(p) => p && setPeriod(p)} />
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="kpis">
        <div className="kpi" style={{ cursor: "default" }}>
          <span className="kpi-label"><UserPlus size={15} /> Leads que entraram</span>
          <span className="kpi-value num">{k?.entered ?? "–"}</span>
          <span className="kpi-foot">importados do Google Maps</span>
        </div>
        <div className="kpi" style={{ cursor: "default" }}>
          <span className="kpi-label"><MessageCircle size={15} /> Contatos feitos</span>
          <span className="kpi-value num">{k?.contacts ?? "–"}</span>
          <span className="kpi-foot">{k ? `em ${k.leadsContacted} ${k.leadsContacted === 1 ? "lead" : "leads"}` : " "}</span>
        </div>
        <div className="kpi" style={{ cursor: "default" }}>
          <span className="kpi-label"><ArrowRightLeft size={15} /> Movimentações</span>
          <span className="kpi-value num">{k?.moves ?? "–"}</span>
          <span className="kpi-foot">leads trocados de etapa</span>
        </div>
        <div className="kpi" style={{ cursor: "default" }}>
          <span className="kpi-label"><Trophy size={15} /> Fechados</span>
          <span className="kpi-value num">{k?.won ?? "–"}</span>
          <span className="kpi-foot">{k ? `${k.lost} ${k.lost === 1 ? "perdido" : "perdidos"}` : " "}</span>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head"><h2>Contatos por {byMonth ? "mês" : "dia"}</h2><span className="spacer" /><span className="meta">WhatsApp, ligação, e-mail, reunião e Instagram</span></div>
          <div className="panel-body">
            <GroupedBars categories={data?.buckets.labels ?? []} series={contactSeries} empty="Nenhum contato registrado no período." />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Para onde os leads foram</h2><span className="spacer" /><span className="meta">movimentações por etapa de destino</span></div>
          <div className="panel-body">
            <Ranking
              items={(data?.movesByStage ?? []).map((s) => ({ label: s.name, value: s.count, color: stageColor(s.position, s.kind) }))}
              empty="Nenhum lead foi movido no período."
            />
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head"><h2>Leads que entraram por {byMonth ? "mês" : "dia"}</h2></div>
          <div className="panel-body">
            <GroupedBars categories={data?.buckets.labels ?? []} series={[{ name: "Entraram", color: "var(--brand-400)", values: data?.buckets.entered ?? [] }]} height={160} empty="Nenhum lead entrou no período." />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Por pessoa</h2><span className="spacer" /><span className="meta">quem contatou e quem moveu</span></div>
          <div className="panel-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <span className="label" style={{ display: "block", marginBottom: 8 }}>Contatos</span>
              <Ranking items={data?.contactsByAuthor ?? []} empty="Ninguém contatou." />
            </div>
            <div>
              <span className="label" style={{ display: "block", marginBottom: 8 }}>Movimentações</span>
              <Ranking items={(data?.movesByAuthor ?? []).map((i) => ({ ...i, color: "var(--brand-200)" }))} empty="Ninguém moveu." />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
