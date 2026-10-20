"use client";

import { CalendarClock, Flame, Handshake, MessageCircle, Plus, Radar, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOpenLead } from "@/components/LeadDrawer";
import { Due, PriorityBadge, Stars } from "@/components/ui";
import { useApi } from "@/lib/client";
import { dateTime, money, shortReason, stageColor, waLink } from "@/lib/format";
import type { Lead, Search, Stage } from "@/lib/types";

type Stats = {
  kpis: { total: number; inPipeline: number; toContact: number; overdue: number; today: number; won: number; wonValue: number };
  byStage: (Stage & { count: number; total: number })[];
  followups: Lead[];
  opportunities: Lead[];
  searches: Search[];
};

/** Enter / Space on a row-as-button. */
function activate(e: React.KeyboardEvent, fn: () => void) {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
}

const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export default function Home() {
  const router = useRouter();
  const openLead = useOpenLead();
  const { data, error } = useApi<Stats>("/api/stats", { pollMs: 30_000 });

  if (error) return <div className="page"><div className="error-box">{error}</div></div>;
  const k = data?.kpis;
  const total = data?.byStage.reduce((a, s) => a + s.count, 0) ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Início</h1>
        <span className="sub">{today}</span>
        <span className="spacer" />
        <Link href="/buscar" className="btn btn-primary"><Plus size={16} /> Nova busca</Link>
      </div>

      {data && k && k.total === 0 ? (
        <div className="panel">
          <div className="empty" style={{ padding: "48px 16px" }}>
            <Radar size={28} aria-hidden />
            <strong>Nenhum lead ainda</strong>
            <span>Faça a primeira busca no Google Maps: escolha o tipo de negócio e a cidade.</span>
            <Link href="/buscar" className="btn btn-primary"><Plus size={16} /> Buscar leads</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="kpis">
            <button className="kpi" onClick={() => router.push("/leads?priority=ALTA&stage=first")}>
              <span className="kpi-label"><Flame size={15} /> Para contatar</span>
              <span className="kpi-value">{k?.toContact ?? "–"}</span>
              <span className="kpi-foot">prioridade alta, ainda em Novo</span>
            </button>
            <button className={`kpi${k?.overdue ? " alert" : ""}`} onClick={() => router.push("/leads?followup=overdue&sort=followup")}>
              <span className="kpi-label"><CalendarClock size={15} /> Retornos atrasados</span>
              <span className="kpi-value">{k?.overdue ?? "–"}</span>
              <span className="kpi-foot">{k?.today ? <><b className="num">{k.today}</b> para hoje</> : "nenhum para hoje"}</span>
            </button>
            <button className="kpi" onClick={() => router.push("/funil")}>
              <span className="kpi-label"><Handshake size={15} /> Em negociação</span>
              <span className="kpi-value">{k?.inPipeline ?? "–"}</span>
              <span className="kpi-foot">de {k?.total.toLocaleString("pt-BR") ?? "–"} leads no total</span>
            </button>
            <button className="kpi" onClick={() => router.push("/funil")}>
              <span className="kpi-label"><Trophy size={15} /> Fechados</span>
              <span className="kpi-value">{k?.won ?? "–"}</span>
              <span className="kpi-foot">{k?.wonValue ? money(k.wonValue) + " em negócios" : "nenhum valor registrado"}</span>
            </button>
          </div>
          <div className="home-cols">
            <div className="stack">
              <section className="panel">
                <div className="panel-head">
                  <h2>Retornos</h2>
                  <span className="meta">atrasados e próximos 7 dias</span>
                  <span className="spacer" />
                  <Link href="/leads?followup=upcoming&sort=followup" className="btn btn-ghost btn-sm">Ver todos</Link>
                </div>
                {data?.followups.length ? (
                  <ul className="rows">
                    {data.followups.map((l) => (
                      <li key={l.id} className="row-item" tabIndex={0} role="button" onClick={() => openLead(l.id)} onKeyDown={(e) => activate(e, () => openLead(l.id))}>
                        <div className="row-title"><span className="name">{l.name}</span></div>
                        <div className="row-sub">{l.category}{l.owner ? ` · ${l.owner}` : ""}</div>
                        <div className="row-side">
                          <Due iso={l.next_followup} />
                          {l.whatsapp && (
                            <a className="icon-link wa" href={waLink(l.whatsapp)} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()} aria-label={`WhatsApp de ${l.name}`}>
                              <MessageCircle size={16} />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty">
                    <strong>Nenhum retorno agendado</strong>
                    <span>Ao registrar um contato, o CRM agenda o próximo retorno automaticamente.</span>
                  </div>
                )}
              </section>
              <section className="panel">
                <div className="panel-head"><h2>Funil</h2><span className="spacer" /><Link href="/funil" className="btn btn-ghost btn-sm">Abrir funil</Link></div>
                <div className="panel-body">
                  <div className="stagebar" role="img" aria-label="Distribuição dos leads por etapa">
                    {data?.byStage.filter((s) => s.count).map((s) => (
                      <span key={s.id} style={{ width: `${(s.count / Math.max(total, 1)) * 100}%`, background: stageColor(s.position, s.kind) }} />
                    ))}
                  </div>
                  <div className="stagelegend">
                    {data?.byStage.map((s) => (
                      <Link key={s.id} href={`/leads?stage=${s.id}`}>
                        <i style={{ background: stageColor(s.position, s.kind) }} />{s.name} <b>{s.count}</b>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
              <section className="panel">
                <div className="panel-head"><h2>Últimas buscas</h2><span className="spacer" /><Link href="/buscar" className="btn btn-ghost btn-sm">Buscar leads</Link></div>
                {data?.searches.length ? (
                  <ul className="rows">
                    {data.searches.map((s) => (
                      <li key={s.id} className="row-item" tabIndex={0} role="link" onClick={() => router.push(`/leads?search=${s.id}`)} onKeyDown={(e) => activate(e, () => router.push(`/leads?search=${s.id}`))}>
                        <div className="row-title"><span className="name">{s.label}</span></div>
                        <div className="row-sub">{s.city} · {dateTime(s.created_at)}</div>
                        <div className="row-side">
                          {s.status === "done" ? <span className="hint num">{s.imported} novos</span>
                            : s.status === "failed" ? <span className="badge badge-lost">Falhou</span>
                            : <span className="badge badge-stage">Em andamento</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty"><span>Nenhuma busca feita pelo CRM ainda.</span></div>
                )}
              </section>
            </div>
            <div className="stack">
              <section className="panel">
                <div className="panel-head">
                  <h2>Melhores oportunidades</h2>
                  <span className="meta">alta prioridade, ainda não contatados</span>
                  <span className="spacer" />
                  <Link href="/leads?priority=ALTA&stage=first" className="btn btn-ghost btn-sm">Ver todas</Link>
                </div>
                {data?.opportunities.length ? (
                  <ul className="rows">
                    {data.opportunities.map((l) => (
                      <li key={l.id} className="row-item" tabIndex={0} role="button" onClick={() => openLead(l.id)} onKeyDown={(e) => activate(e, () => openLead(l.id))}>
                        <div className="row-title">
                          <PriorityBadge p={l.priority} />
                          <span className="name">{l.name}</span>
                        </div>
                        <div className="row-sub reason">{shortReason(l)}</div>
                        <div className="row-side">
                          <Stars rating={l.rating} reviews={l.reviews} />
                          {l.whatsapp && (
                            <a className="icon-link wa" href={waLink(l.whatsapp)} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()} aria-label={`WhatsApp de ${l.name}`}>
                              <MessageCircle size={16} />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty"><span>Todas as oportunidades de alta prioridade já foram contatadas.</span></div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
