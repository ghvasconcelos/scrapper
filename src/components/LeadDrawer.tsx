"use client";

import {
  CalendarClock, CalendarPlus, Check, Globe, Mail, MapPin, MessageCircle, NotebookPen, Pencil, Phone, Sparkles, Users, X,
} from "lucide-react";
import { Facebook, Instagram } from "./brand-icons";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, emitChanged, useApi, useCurrentUser } from "@/lib/client";
import {
  addDaysISO, cityName, dateTime, fillTemplate, instagramHandle, prettyUrl, todayISO, waLink,
} from "@/lib/format";
import { EVENT_STATUS, EVENT_TYPES } from "@/lib/log-meta";
import type { Activity, CalEvent, Lead, Stage, Template } from "@/lib/types";
import { EventDialog, type DialogInit } from "./EventDialog";
import { useToast } from "./Toasts";
import { Due, NeedsSiteBadge, PriorityBadge, Stars } from "./ui";

const Ctx = createContext<(id: number) => void>(() => {});
export const useOpenLead = () => useContext(Ctx);

export function LeadDrawerProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const open = useCallback((leadId: number) => {
    opener.current = document.activeElement as HTMLElement | null;
    setId(leadId);
  }, []);
  const close = useCallback(() => {
    setId(null);
    opener.current?.focus?.();
  }, []);
  // Deep link: any page with ?lead=123 opens that lead.
  useEffect(() => {
    const fromUrl = Number(new URLSearchParams(window.location.search).get("lead"));
    if (!fromUrl) return;
    const t = setTimeout(() => setId(fromUrl)); // after hydration
    return () => clearTimeout(t);
  }, []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {id !== null && <LeadDrawer id={id} onClose={close} />}
    </Ctx.Provider>
  );
}

type Detail = { lead: Lead; activities: Activity[]; events: CalEvent[] };
type Meta = { stages: Stage[]; team: string[] };

const LOG_TYPES: { type: Activity["type"]; label: string }[] = [
  { type: "nota", label: "Nota" }, { type: "whatsapp", label: "WhatsApp" }, { type: "ligacao", label: "Ligação" },
  { type: "instagram", label: "Instagram" }, { type: "email", label: "E-mail" }, { type: "reuniao", label: "Reunião" },
];

const TL_ICON: Record<Activity["type"], React.ReactNode> = {
  nota: <NotebookPen size={13} />, whatsapp: <MessageCircle size={13} />, ligacao: <Phone size={13} />,
  instagram: <Instagram size={13} />, email: <Mail size={13} />, reuniao: <Users size={13} />, sistema: <Check size={13} />,
};

function LeadDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const toast = useToast();
  const { data, setData, reload } = useApi<Detail>(`/api/leads/${id}`);
  const { data: meta } = useApi<Meta>("/api/meta");
  const { data: tpl } = useApi<{ templates: Template[] }>("/api/templates");
  const [tplId, setTplId] = useState<number | null>(null);
  const [pickedType, setLogType] = useState<Activity["type"] | null>(null);
  const [logText, setLogText] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Lead>>({});
  // a popup de compromisso abre por cima da ficha; enquanto está aberta, Esc fecha só ela
  const [evDialog, setEvDialog] = useState<DialogInit | null>(null);
  const dialogOpen = useRef(false);
  dialogOpen.current = !!evDialog;

  const panel = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const loaded = !!data;
  useEffect(() => {
    if (loaded) closeBtn.current?.focus();
  }, [loaded]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen.current) return;
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!panel.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lead = data?.lead;
  // Under the WhatsApp action, logging defaults to a WhatsApp contact when the lead has one.
  const logType: Activity["type"] = pickedType ?? (lead?.whatsapp ? "whatsapp" : "nota");
  const templates = tpl?.templates ?? [];
  const template = templates.find((t) => t.id === tplId) ?? templates[0];
  const me = useCurrentUser();
  const message = useMemo(() => (lead && template ? fillTemplate(template, lead, me) : ""), [lead, template, me]);

  async function save(patch: Partial<Lead>, ok?: string) {
    try {
      const d = await api<Detail>(`/api/leads/${id}`, { method: "PATCH", json: patch });
      setData(d);
      emitChanged();
      if (ok) toast(ok);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function log(type: Activity["type"], text: string) {
    try {
      const d = await api<Detail>(`/api/leads/${id}/activities`, { method: "POST", json: { type, text } });
      setData(d);
      emitChanged();
      return true;
    } catch (e) {
      toast((e as Error).message, true);
      return false;
    }
  }

  function sendWhatsApp() {
    if (!lead?.whatsapp) return;
    window.open(waLink(lead.whatsapp, message), "_blank", "noopener");
    setLogType("whatsapp");
    void log("whatsapp", `Mensagem enviada pelo WhatsApp${template ? ` (modelo "${template.name}")` : ""}`).then(
      (ok) => ok && toast("Contato registrado. Próximo retorno agendado."),
    );
  }

  const stages = meta?.stages ?? [];
  const team = meta?.team ?? [];

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden />
      <aside ref={panel} className="drawer" role="dialog" aria-modal="true" aria-label={lead ? `Lead ${lead.name}` : "Lead"}>
        {!lead ? (
          <div className="empty" style={{ marginTop: 80 }}>Carregando lead…</div>
        ) : (
          <>
            <header className="drawer-head">
              <div className="drawer-title">
                <h2>{lead.name}</h2>
                <button ref={closeBtn} className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>
              <div className="drawer-meta">
                <PriorityBadge p={lead.priority} />
                <span>{lead.category || "Sem categoria"}</span>
                {lead.city && <span>· {cityName(lead.city)}</span>}
                <Stars rating={lead.rating} reviews={lead.reviews} />
              </div>
              <div className="drawer-controls">
                <span className="label">Etapa</span>
                <select className="select" aria-label="Etapa" value={lead.stage_id}
                  onChange={(e) => save({ stage_id: Number(e.target.value) }, "Etapa atualizada")}>
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className="select" aria-label="Responsável" value={lead.owner}
                  onChange={(e) => save({ owner: e.target.value })}>
                  <option value="">Sem responsável</option>
                  {team.map((n) => <option key={n} value={n}>{n}</option>)}
                  {lead.owner && !team.includes(lead.owner) && <option value={lead.owner}>{lead.owner}</option>}
                </select>
              </div>
            </header>

            <div className="drawer-body">
              {/* Contact */}
              <section className="section">
                <h3><MessageCircle size={14} /> Abordar</h3>
                <div className="section-body">
                  {lead.whatsapp ? (
                    <>
                      {templates.length > 0 && (
                        <select className="select" aria-label="Modelo de mensagem" value={template?.id ?? ""}
                          onChange={(e) => setTplId(Number(e.target.value))}>
                          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                      {message && <div className="wa-preview">{message}</div>}
                      <div className="actions">
                        <button className="btn btn-wa" onClick={sendWhatsApp}>
                          <MessageCircle size={16} /> Abrir WhatsApp com a mensagem
                        </button>
                        <a className="btn" href={waLink(lead.whatsapp)} target="_blank" rel="noopener noreferrer">Só abrir conversa</a>
                      </div>
                      <p className="hint">
                        {lead.whatsapp_source === "site"
                          ? "WhatsApp confirmado: veio de um link oficial da empresa."
                          : "WhatsApp provável: é um número de celular; confira antes de insistir."}
                        {!me && " Escolha seu nome na barra superior para assinar a mensagem."}
                      </p>
                    </>
                  ) : (
                    <p className="hint">Sem WhatsApp identificado. Use telefone ou Instagram.</p>
                  )}
                  <div className="actions">
                    {lead.phone && <a className="btn btn-sm" href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}><Phone size={14} /> Ligar</a>}
                    {lead.instagram && <a className="btn btn-sm" href={lead.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={14} /> Instagram</a>}
                    {lead.website && <a className="btn btn-sm" href={lead.website} target="_blank" rel="noopener noreferrer"><Globe size={14} /> Link do Google</a>}
                    {lead.maps_link && <a className="btn btn-sm" href={lead.maps_link} target="_blank" rel="noopener noreferrer"><MapPin size={14} /> Google Maps</a>}
                  </div>
                  <div className="divider" aria-hidden />
                  <span className="label">Registrar o que aconteceu</span>
                  <div className="seg" role="group" aria-label="Tipo de registro" style={{ flexWrap: "wrap" }}>
                    {LOG_TYPES.map((t) => (
                      <button key={t.type} aria-pressed={logType === t.type} onClick={() => setLogType(t.type)}>{t.label}</button>
                    ))}
                  </div>
                  <textarea className="textarea" rows={3} value={logText} onChange={(e) => setLogText(e.target.value)}
                    placeholder={logType === "nota" ? "Escreva uma nota sobre este lead…" : "O que aconteceu? (opcional)"} />
                  <div className="actions">
                    <button className="btn btn-primary" onClick={async () => {
                      if (await log(logType, logText)) {
                        setLogText("");
                        toast(logType === "nota" ? "Nota salva" : "Contato registrado");
                      }
                    }}>
                      {logType === "nota" ? "Salvar nota" : "Registrar contato"}
                    </button>
                    {logType !== "nota" && <span className="hint">Leads em “Novo” passam para a próxima etapa.</span>}
                  </div>
                </div>
              </section>

              {/* Why */}
              <section className="section">
                <h3><Sparkles size={14} /> Por que vender</h3>
                <div className="section-body">
                  <div className="why-site">
                    <NeedsSiteBadge n={lead.needs_site} />
                    <p>{lead.site_argument || "Tem site próprio funcionando."}</p>
                  </div>
                  {lead.marketing_arguments.length > 0 && (
                    <>
                      <span className="label">Marketing e tráfego pago</span>
                      <ul className="why-list">
                        {lead.marketing_arguments.map((m) => (
                          <li key={m}><Check size={14} aria-hidden />{m}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </section>

              {/* Follow-up + value */}
              <section className="section">
                <h3><CalendarClock size={14} /> Próximo contato</h3>
                <div className="section-body">
                  <div className="actions" style={{ alignItems: "center" }}>
                    <input type="date" className="input" aria-label="Data do próximo contato" value={lead.next_followup ?? ""}
                      onChange={(e) => save({ next_followup: e.target.value || null })} />
                    <Due iso={lead.next_followup} />
                  </div>
                  <div className="quickdates">
                    {[["Amanhã", 1], ["Em 3 dias", 3], ["Em 1 semana", 7], ["Em 2 semanas", 14]].map(([l, n]) => (
                      <button key={l} className="btn btn-sm" onClick={() => save({ next_followup: addDaysISO(n as number) }, "Retorno agendado")}>{l}</button>
                    ))}
                    {lead.next_followup && <button className="btn btn-sm btn-ghost" onClick={() => save({ next_followup: null })}>Limpar</button>}
                  </div>
                  <div className="divider" aria-hidden />
                  <div className="actions" style={{ alignItems: "center" }}>
                    <button className="btn btn-sm" onClick={() => setEvDialog({
                      lead: { id: lead.id, name: lead.name },
                      date: lead.next_followup && lead.next_followup >= todayISO() ? lead.next_followup : todayISO(),
                    })}>
                      <CalendarPlus size={14} /> Agendar reunião
                    </button>
                    <span className="hint">aparece na Agenda</span>
                  </div>
                  {data.events.length > 0 && (
                    <ul className="evlist">
                      {data.events.map((ev) => (
                        <li key={ev.id}>
                          <button type="button" className="evitem" data-status={ev.status} onClick={() => setEvDialog({ event: ev })}>
                            <i style={{ background: EVENT_TYPES.find((t) => t.type === ev.type)?.color }} aria-hidden />
                            <span className="evitem-title">{ev.title}</span>
                            <span className="evitem-when num">{dateTime(ev.starts_at)}</span>
                            <span className="badge badge-outline">{EVENT_STATUS[ev.status]}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="field">
                    <label htmlFor="value">Valor estimado do negócio (R$)</label>
                    <input id="value" className="input" type="number" min={0} step={50} style={{ maxWidth: 180 }}
                      defaultValue={lead.value ?? ""} key={`v${lead.id}`}
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        if (v !== lead.value) void save({ value: v }, "Valor salvo");
                      }} />
                  </div>
                </div>
              </section>

              {/* Contacts */}
              <section className="section">
                <h3>
                  Dados de contato
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}
                    onClick={() => {
                      if (editing) void save(draft, "Contatos atualizados");
                      setDraft({ phone: lead.phone, whatsapp: lead.whatsapp, email: lead.email, instagram: lead.instagram, facebook: lead.facebook });
                      setEditing(!editing);
                    }}>
                    {editing ? <><Check size={14} /> Salvar</> : <><Pencil size={13} /> Editar</>}
                  </button>
                </h3>
                <div className="section-body">
                  <dl className="kv">
                    {([
                      ["phone", "Telefone", <Phone key="i" size={13} />],
                      ["whatsapp", "WhatsApp", <MessageCircle key="i" size={13} />],
                      ["email", "E-mail", <Mail key="i" size={13} />],
                      ["instagram", "Instagram", <Instagram key="i" size={13} />],
                      ["facebook", "Facebook", <Facebook key="i" size={13} />],
                    ] as const).map(([k, label]) => (
                      <div key={k} style={{ display: "contents" }}>
                        <dt>{label}</dt>
                        <dd>
                          {editing ? (
                            <input className="input" aria-label={label} value={(draft[k] as string) ?? ""}
                              onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                          ) : !lead[k] ? (
                            <span className="hint">—</span>
                          ) : k === "instagram" ? (
                            <a href={lead.instagram} target="_blank" rel="noopener noreferrer">{instagramHandle(lead.instagram)}</a>
                          ) : k === "facebook" ? (
                            <a href={lead.facebook} target="_blank" rel="noopener noreferrer">{prettyUrl(lead.facebook)}</a>
                          ) : k === "whatsapp" ? (
                            <a href={waLink(lead.whatsapp)} target="_blank" rel="noopener noreferrer">
                              {prettyUrl(lead.whatsapp)}{lead.whatsapp_source === "celular" ? " (provável)" : ""}
                            </a>
                          ) : k === "email" ? (
                            <a href={`mailto:${lead.email.split(",")[0]}`}>{lead.email}</a>
                          ) : (
                            lead[k]
                          )}
                        </dd>
                      </div>
                    ))}
                    <dt>Link no Google</dt>
                    <dd>{lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer">{prettyUrl(lead.website)}</a> : <span className="hint">—</span>}</dd>
                    <dt>Endereço</dt>
                    <dd>{lead.address || <span className="hint">—</span>}</dd>
                  </dl>
                </div>
              </section>

              {/* Log + history */}
              <section className="section">
                <h3><NotebookPen size={14} /> Histórico</h3>
                <div className="section-body">
                  <ul className="timeline">
                    {data.activities.map((a) => (
                      <li key={a.id}>
                        <span className={`tl-icon ${a.type}`}>{TL_ICON[a.type]}</span>
                        <div>
                          <div className="tl-text">{a.text || LOG_TYPES.find((t) => t.type === a.type)?.label}</div>
                          <div className="tl-meta">{dateTime(a.created_at)}{a.author ? ` · ${a.author}` : ""}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
            {evDialog && <EventDialog init={evDialog} onClose={() => setEvDialog(null)} onSaved={() => { reload(); emitChanged(); }} />}
          </>
        )}
      </aside>
    </>
  );
}
