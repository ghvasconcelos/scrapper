import type { Lead, Template } from "./types";

export const todayISO = () => new Date().toLocaleDateString("sv-SE");

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("sv-SE");
}

function daysFromToday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "atrasado 3 dias" / "hoje" / "amanhã" / "qui, 9 out" */
export function dueLabel(iso: string | null): { text: string; tone: "late" | "today" | "" } {
  if (!iso) return { text: "—", tone: "" };
  const n = daysFromToday(iso);
  if (n < 0) return { text: n === -1 ? "atrasado 1 dia" : `atrasado ${-n} dias`, tone: "late" };
  if (n === 0) return { text: "hoje", tone: "today" };
  if (n === 1) return { text: "amanhã", tone: "" };
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    text: n < 7 ? `${WEEKDAYS[date.getDay()]}, ${d}` : date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }),
    tone: "",
  };
}

export function dateTime(sqlite: string): string {
  const d = new Date(sqlite.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return sqlite;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const money = (v: number | null | undefined) =>
  v ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "";

export const cityName = (city: string) => city.replace(/[\s,–-]+[A-Z]{2}$/, "").trim();

/** Short headline for lists: the website reason without the reputation tail. */
export function shortReason(l: Pick<Lead, "site_argument" | "marketing_arguments">): string {
  return l.site_argument.split(" — ")[0] || l.marketing_arguments[0] || "";
}

/** Conversational version of the website reason, for {motivo} in WhatsApp templates. */
export function friendlyReason(l: Pick<Lead, "site_argument" | "website_kind">): string {
  const a = l.site_argument;
  if (l.website_kind === "vazio") return "vocês ainda não têm um site aparecendo no Google";
  if (l.website_kind === "instagram") return "o link de site de vocês no Google leva para o Instagram";
  if (l.website_kind === "whatsapp") return "o botão de site de vocês no Google abre direto o WhatsApp";
  if (l.website_kind === "facebook") return "o link de site de vocês no Google leva para o Facebook";
  if (l.website_kind === "links") return "vocês usam uma página de links no lugar de um site";
  if (l.website_kind === "delivery") return "o link de site de vocês no Google é só o cardápio de pedidos";
  if (a.startsWith("Site fora do ar") || a.startsWith("Site com erro")) return "o site de vocês não está abrindo";
  if (a.startsWith("Link de site")) return "o link do site de vocês no Google está quebrado";
  if (a.startsWith("Site não é adaptado")) return "o site de vocês não está adaptado para celular";
  return "dá para atrair bem mais clientes pelo Google";
}

export function fillTemplate(t: Template, l: Lead, me: string): string {
  const vars: Record<string, string> = {
    nome: l.name,
    categoria: (l.category || "negócios").toLowerCase(),
    cidade: cityName(l.city) || "sua cidade",
    motivo: friendlyReason(l),
    nota: l.rating ? l.rating.toFixed(1).replace(".", ",") : "boa",
    meu_nome: me || "a equipe",
  };
  return t.body.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

export function waLink(whatsapp: string, text?: string): string {
  const num = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function instagramHandle(url: string): string {
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  return m ? "@" + m[1] : url;
}

export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

// etapas abertas percorrem a paleta da marca, do lilás ao roxo profundo
export const STAGE_COLORS = ["#d6bfff", "#b17cff", "#8f5bff", "#6a35ff", "#3800ff"];
export function stageColor(position: number, kind: string): string {
  if (kind === "won") return "#3fcf95";
  if (kind === "lost") return "#ff6f78";
  return STAGE_COLORS[position % 5];
}
