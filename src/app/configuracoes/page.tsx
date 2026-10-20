"use client";

import { ChevronDown, ChevronUp, Download, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/Toasts";
import { api, emitChanged, useApi } from "@/lib/client";
import type { Stage, Template } from "@/lib/types";

const VARS = ["{nome}", "{categoria}", "{cidade}", "{motivo}", "{nota}", "{meu_nome}"];

function Team() {
  const toast = useToast();
  const { data, setData } = useApi<{ team: string[]; scraper_url: string }>("/api/settings");
  const [name, setName] = useState("");
  const team = data?.team ?? [];

  async function saveTeam(next: string[]) {
    try {
      setData(await api("/api/settings", { method: "PUT", json: { team: next } }));
      emitChanged();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head"><h2>Equipe</h2><span className="meta">sem login: cada um escolhe o nome na barra superior</span></div>
      <div className="panel-body form">
        <div className="chips">
          {team.map((n) => (
            <button key={n} className="chip" aria-pressed="true" onClick={() => saveTeam(team.filter((x) => x !== n))} aria-label={`Remover ${n}`}>
              {n} <span className="x"><X size={13} /></span>
            </button>
          ))}
          {!team.length && <span className="hint">Ninguém cadastrado ainda. Os nomes assinam as mensagens e o histórico.</span>}
        </div>
        <form style={{ display: "flex", gap: 6 }} onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && !team.includes(name.trim())) void saveTeam([...team, name.trim()]);
          setName("");
        }}>
          <input className="input" style={{ flex: 1 }} placeholder="Nome (ex.: Brenno)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da pessoa" />
          <button className="btn" disabled={!name.trim()}><Plus size={15} /> Adicionar</button>
        </form>
      </div>
    </section>
  );
}

function Stages() {
  const toast = useToast();
  const { data, setData } = useApi<{ stages: Stage[] }>("/api/stages");
  const [edits, setList] = useState<Stage[] | null>(null);
  const [newName, setNewName] = useState("");
  const list = edits ?? data?.stages ?? [];
  const dirty = JSON.stringify(list.map((s) => [s.id, s.name])) !== JSON.stringify((data?.stages ?? []).map((s) => [s.id, s.name]));

  async function run(p: Promise<{ stages: Stage[] }>, ok: string) {
    try {
      setData(await p);
      setList(null);
      emitChanged();
      toast(ok);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  const moveTo = (i: number, j: number) => {
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  };

  return (
    <section className="panel">
      <div className="panel-head"><h2>Etapas do funil</h2></div>
      <div className="panel-body form">
        {list.map((s, i) => (
          <div key={s.id} className="stage-row">
            <span className="kind">{s.kind === "won" ? "ganho" : s.kind === "lost" ? "perdido" : "aberta"}</span>
            <input className="input" value={s.name} aria-label={`Nome da etapa ${i + 1}`}
              onChange={(e) => setList(list.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))} />
            <div style={{ display: "flex", gap: 2 }}>
              <button className="btn btn-ghost btn-sm btn-icon" aria-label="Subir" disabled={i === 0} onClick={() => moveTo(i, i - 1)}><ChevronUp size={15} /></button>
              <button className="btn btn-ghost btn-sm btn-icon" aria-label="Descer" disabled={i === list.length - 1} onClick={() => moveTo(i, i + 1)}><ChevronDown size={15} /></button>
              <button className="btn btn-ghost btn-sm btn-icon btn-danger" aria-label={`Remover ${s.name}`} disabled={s.kind !== "open"}
                onClick={() => run(api(`/api/stages?id=${s.id}`, { method: "DELETE" }), "Etapa removida")}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="btn btn-primary" disabled={!dirty}
            onClick={() => run(api("/api/stages", { method: "PUT", json: { stages: list } }), "Etapas salvas")}>Salvar alterações</button>
          {dirty && <button className="btn btn-ghost" onClick={() => setList(null)}>Desfazer</button>}
        </div>
        <form style={{ display: "flex", gap: 6 }} onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) void run(api("/api/stages", { method: "POST", json: { name: newName } }), "Etapa criada");
          setNewName("");
        }}>
          <input className="input" style={{ flex: 1 }} placeholder="Nova etapa (entra antes de Fechado)" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Nome da nova etapa" />
          <button className="btn" disabled={!newName.trim()}><Plus size={15} /> Criar</button>
        </form>
      </div>
    </section>
  );
}

function Templates() {
  const toast = useToast();
  const { data, setData } = useApi<{ templates: Template[] }>("/api/templates");
  const [edits, setEdits] = useState<Record<number, Template>>({});

  async function run(p: Promise<{ templates: Template[] }>, ok: string) {
    try {
      setData(await p);
      setEdits({});
      toast(ok);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head"><h2>Modelos de mensagem do WhatsApp</h2></div>
      <div className="panel-body form">
        <div className="vars" aria-label="Variáveis disponíveis">{VARS.map((v) => <code key={v}>{v}</code>)}</div>
        <span className="hint">{"{motivo}"} vira uma frase sobre o problema do site do lead, por exemplo: &quot;o link de site de vocês no Google leva para o Instagram&quot;.</span>
        {data?.templates.map((t) => {
          const e = edits[t.id] ?? t;
          const changed = e.name !== t.name || e.body !== t.body;
          return (
            <div key={t.id} className="tpl">
              <input className="input" value={e.name} aria-label="Nome do modelo" onChange={(ev) => setEdits({ ...edits, [t.id]: { ...e, name: ev.target.value } })} />
              <textarea className="textarea" rows={4} value={e.body} aria-label="Texto do modelo" onChange={(ev) => setEdits({ ...edits, [t.id]: { ...e, body: ev.target.value } })} />
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-sm btn-primary" disabled={!changed} onClick={() => run(api("/api/templates", { method: "PUT", json: e }), "Modelo salvo")}>Salvar</button>
                <button className="btn btn-sm btn-ghost btn-danger" onClick={() => confirm(`Excluir o modelo "${t.name}"?`) && run(api(`/api/templates?id=${t.id}`, { method: "DELETE" }), "Modelo excluído")}>
                  <Trash2 size={13} /> Excluir
                </button>
              </div>
            </div>
          );
        })}
        <button className="btn" onClick={() => run(api("/api/templates", { method: "POST", json: { name: "Novo modelo", body: "Oi, tudo bem? Aqui é {meu_nome}…" } }), "Modelo criado")}>
          <Plus size={15} /> Novo modelo
        </button>
      </div>
    </section>
  );
}

function ScraperSettings() {
  const toast = useToast();
  const { data: settings, setData } = useApi<{ team: string[]; scraper_url: string }>("/api/settings");
  const { data: health, reload } = useApi<{ scraper: boolean; url: string }>("/api/health");
  const [draftUrl, setUrl] = useState<string | null>(null);
  const url = draftUrl ?? settings?.scraper_url ?? "";

  return (
    <section className="panel">
      <div className="panel-head"><h2>Scraper e dados</h2></div>
      <div className="panel-body form">
        <div className="rail-status" style={{ padding: 0, color: "var(--ink)" }}>
          <i className={`dot ${health ? (health.scraper ? "on" : "off") : ""}`} aria-hidden />
          <span>{!health ? "Verificando…" : health.scraper ? `Scraper online em ${health.url}` : `Scraper offline em ${health.url}: abra o Docker Desktop`}</span>
        </div>
        <div className="field">
          <label htmlFor="surl">Endereço do scraper</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input id="surl" className="input" style={{ flex: 1 }} placeholder="http://localhost:8080" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn" onClick={async () => {
              try {
                setData(await api("/api/settings", { method: "PUT", json: { scraper_url: url } }));
                setUrl(null);
                void reload();
                toast("Endereço salvo");
              } catch (e) {
                toast((e as Error).message, true);
              }
            }}>Salvar</button>
          </div>
          <span className="hint">Deixe vazio para usar o padrão. Só endereços locais: o scraper não tem senha.</span>
        </div>
        <div className="field">
          <span className="label">Backup</span>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
          <div><a className="btn" href="/api/leads/export"><Download size={15} /> Exportar todos os leads (CSV)</a></div>
          <span className="hint">O banco fica em <code>crm/data/crm.db</code>. Copie esse arquivo para fazer backup completo.</span>
        </div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="page">
      <div className="page-head"><h1>Configurações</h1></div>
      <div className="settings">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <Team />
          <Stages />
          <ScraperSettings />
        </div>
        <Templates />
      </div>
    </div>
  );
}
