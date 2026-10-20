"use client";

import { CalendarDays, ChartColumn, ChevronRight, Columns3, FileClock, Hexagon, House, MapPinned, Radar, Settings, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { setCurrentUser, useApi, useCurrentUser } from "@/lib/client";
import { LeadDrawerProvider } from "./LeadDrawer";
import { ToastProvider } from "./Toasts";

const NAV = [
  { href: "/", label: "Início", icon: House },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/funil", label: "Funil", icon: Columns3 },
  { href: "/mapa", label: "Mapa", icon: MapPinned },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/indicadores", label: "Indicadores", icon: ChartColumn },
  { href: "/historico", label: "Histórico", icon: FileClock },
  { href: "/buscar", label: "Buscar leads", icon: Radar },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

// Quem está usando: fica na barra superior, como o menu do usuário do ProHand.
function UserPicker() {
  const { data } = useApi<{ team: string[] }>("/api/settings");
  const user = useCurrentUser();
  const team = data?.team ?? [];
  if (!team.length) {
    return (
      <Link href="/configuracoes" className="rail-status" title="Cadastre os nomes da equipe">
        <UserPlus size={14} aria-hidden /> <span>Cadastrar equipe</span>
      </Link>
    );
  }
  return (
    <label className="who" title="Quem está usando">
      <span className="avatar" aria-hidden>{user ? initials(user) : "?"}</span>
      <select value={user} onChange={(e) => setCurrentUser(e.target.value)} aria-label="Quem está usando">
        <option value="">Escolha seu nome</option>
        {team.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
}

function ScraperStatus() {
  const { data } = useApi<{ scraper: boolean }>("/api/health", { pollMs: 15_000 });
  const state = data === null ? "" : data.scraper ? "on" : "off";
  return (
    <Link href="/buscar" className="rail-status" title={data?.scraper ? "Scraper rodando" : "Scraper fora do ar: abra o Docker Desktop"}>
      <i className={`dot ${state}`} aria-hidden />
      <span>{data === null ? "Verificando scraper…" : data.scraper ? "Scraper online" : "Scraper offline"}</span>
    </Link>
  );
}

function OverdueCount() {
  const { data } = useApi<{ kpis: { overdue: number } }>("/api/stats", { pollMs: 60_000 });
  return data?.kpis.overdue ? <span className="count num" title="Retornos atrasados">{data.kpis.overdue}</span> : null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const current = NAV.find((n) => isActive(n.href))?.label ?? "Prospecção";
  return (
    <ToastProvider>
      <LeadDrawerProvider>
        <div className="shell">
          <aside className="rail">
            <div className="rail-brand">
              <span className="rail-brand-mark"><Hexagon size={18} strokeWidth={2.2} aria-hidden /></span>
              <span>Prospecção<small>CRM</small></span>
            </div>
            <nav aria-label="Principal">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="rail-link" aria-current={isActive(href) ? "page" : undefined} title={label}>
                  <Icon size={18} aria-hidden />
                  <span>{label}</span>
                  {href === "/" && <OverdueCount />}
                </Link>
              ))}
            </nav>
            <div className="rail-foot">
              <ScraperStatus />
            </div>
          </aside>
          <div className="main">
            {/* barra superior fixa, como no ProHand: título da tela + quem está usando */}
            <header className="topbar">
              <div className="crumbs">
                <span>Prospecção</span>
                <ChevronRight size={14} aria-hidden />
                <h1>{current}</h1>
              </div>
              <UserPicker />
            </header>
            <main className="scroll">{children}</main>
          </div>
        </div>
      </LeadDrawerProvider>
    </ToastProvider>
  );
}
