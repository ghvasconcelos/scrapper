// Turns raw scraper rows into leads with contact channels, sales arguments and a priority.
// Pure code (HTTP + regex): no AI involved. Ported from scripts/scrape.py and the Anápolis analysis.
import dns from "node:dns/promises";
import type { NeedsSite, Priority } from "./types";

export type RawRow = Record<string, string>;

export interface EnrichedLead {
  place_id: string | null;
  name: string;
  category: string;
  phone: string;
  whatsapp: string;
  whatsapp_source: "" | "site" | "celular";
  email: string;
  instagram: string;
  facebook: string;
  website: string;
  website_kind: WebsiteKind;
  address: string;
  maps_link: string;
  rating: number | null;
  reviews: number;
  priority: Priority;
  needs_site: NeedsSite;
  site_argument: string;
  marketing_arguments: string[];
  raw: RawRow;
}

type WebsiteKind = "vazio" | "instagram" | "whatsapp" | "facebook" | "links" | "delivery" | "proprio";
type SiteStatus = "ok" | "dns" | "conn" | "broken" | "server_error" | "blocked";

interface SiteCheck {
  status: SiteStatus;
  html: string;
  pixel: boolean;
  analytics: boolean;
  mobile: boolean;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const PLATFORMS: [string, string][] = [
  ["iFood", "ifood"], ["Goomer", "goomer"], ["Anota AI", "anota.ai"], ["Saipos", "saipos"],
  ["MenuDino", "menudino"], ["AgoraMenu", "agoramenu"], ["Takeat", "takeat"], ["Vuca Food", "vucafood"],
  ["Olá Click", "ola.click"], ["aiqfome", "aiqfome"], ["Delivery Much", "deliverymuch"],
  ["Cardápio Web", "cardapioweb"], ["InstaDelivery", "instadelivery"],
];

const SOCIAL_RE = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/gi,
  facebook: /https?:\/\/(?:www\.|m\.|web\.)?facebook\.com\/([A-Za-z0-9_.\-]+)/gi,
};
const WHATSAPP_RE = /(?:wa\.me\/|whatsapp\.com\/send\/?\?(?:[^"'\s]*?&(?:amp;)?)?phone=)\+?(\d{10,15})/i;
const SKIP_HANDLE = new Set([
  "", "home", "pages", "people", "help", "about", "policies", "policy", "legal", "tos", "privacy", "settings",
  "sharer", "tr", "profile.php", "plugins", "dialog", "intent", "login", "share.php", "permalink.php", "p",
  "reel", "reels", "explore", "stories", "tv", "watch", "events", "groups", "marketplace", "gaming", "photo",
  "hashtag", "search", "whatsapp", "instagram", "facebook", "meta", "wix", "linktree", "ifood",
]);
const JUNK_EMAIL =
  /\.(png|jpe?g|gif|webp|svg|css|js)$|@\dx\.|@(heylink\.me|linktr\.ee|sentry\.io|[\w.-]*wixpress\.com|example\.com|domain\.com|email\.com)$/i;

export function cleanEmails(raw: string): string {
  return (raw || "").split(",").map((e) => e.trim()).filter((e) => e && !JUNK_EMAIL.test(e)).join(", ");
}

export function websiteKind(url: string): WebsiteKind {
  const u = (url || "").toLowerCase();
  if (!u) return "vazio";
  if (u.includes("instagram.com")) return "instagram";
  if (/wa\.me|whatsapp|bit\.ly\/.*wh?a?ts/.test(u)) return "whatsapp";
  if (u.includes("facebook.com")) return "facebook";
  if (/linktr\.ee|heylink\.me|linkr\.bio|beacons\.ai|bio\.link|campsite\.bio|taplink|lnk\.bio/.test(u)) return "links";
  if (PLATFORMS.some(([, k]) => u.includes(k))) return "delivery";
  return "proprio";
}

function platformName(url: string): string {
  const u = url.toLowerCase();
  return PLATFORMS.find(([, k]) => u.includes(k))?.[0] ?? "plataforma de pedidos";
}

function findSocials(text: string) {
  const out = { instagram: "", facebook: "", whatsapp: "" };
  for (const plat of ["instagram", "facebook"] as const) {
    for (const m of text.matchAll(SOCIAL_RE[plat])) {
      const h = m[1].toLowerCase();
      if (SKIP_HANDLE.has(h)) continue;
      if (plat === "facebook" && (/^\d+$/.test(h) || h.length < 3)) continue;
      out[plat] = m[0].replace(/["'/\\]+$/, "").replace(/\\/g, "");
      break;
    }
  }
  const wa = WHATSAPP_RE.exec(text);
  if (wa) out.whatsapp = "https://wa.me/" + wa[1];
  return out;
}

/** Brazilian mobile numbers (DDD + 9 + 8 digits) are almost always on WhatsApp. */
export function brMobileWhatsapp(phone: string): string {
  const p = (phone || "").trim();
  if (!(p.startsWith("+55") || /^\(\d{2}\)/.test(p))) return "";
  let d = p.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d.length === 11 && d[2] === "9" ? "https://wa.me/55" + d : "";
}

async function fetchHtml(url: string, timeoutMs: number): Promise<{ status: number; html: string }> {
  const target = /^https?:\/\//i.test(url) ? url : "http://" + url;
  const res = await fetch(target, {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html,*/*", "Accept-Language": "pt-BR,pt;q=0.9" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const html = (await res.text()).slice(0, 600_000);
  return { status: res.status, html };
}

async function checkSite(url: string, own: boolean): Promise<SiteCheck> {
  const empty: SiteCheck = { status: "ok", html: "", pixel: false, analytics: false, mobile: false };
  let result: { status: number; html: string } | null = null;
  for (const t of [12_000, 25_000]) {
    try {
      result = await fetchHtml(url, t);
      break;
    } catch {
      /* retry once with a longer timeout */
    }
  }
  if (!result) {
    if (!own) return empty;
    try {
      await dns.lookup(new URL(/^https?:\/\//i.test(url) ? url : "http://" + url).hostname);
      return { ...empty, status: "conn" };
    } catch {
      return { ...empty, status: "dns" };
    }
  }
  const { status, html } = result;
  let s: SiteStatus = "ok";
  if (status === 404 || status === 410) s = "broken";
  else if ([401, 403, 429].includes(status)) s = "blocked"; // bot protection: can't judge the site
  else if (status >= 500) s = "server_error";
  return {
    status: s,
    html,
    pixel: /connect\.facebook\.net|fbq\(/.test(html),
    analytics: /googletagmanager\.com|gtag\(|google-analytics\.com/.test(html),
    mobile: /<meta[^>]+name=["']viewport/i.test(html),
  };
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>, onDone?: () => void): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
      onDone?.();
    }
  }));
  return out;
}

const br = (n: number) => n.toFixed(1).replace(".", ",");
const repute = (rating: number, reviews: number) => `nota ${br(rating)}, ${reviews.toLocaleString("pt-BR")} avaliações`;

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export async function enrichRows(rows: RawRow[], onProgress?: (checked: number) => void): Promise<EnrichedLead[]> {
  const medianReviews = median(rows.map((r) => parseInt(r.review_count || "0", 10) || 0));
  let checked = 0;

  return pool(rows, 8, async (r) => {
    const website = (r.website || "").trim();
    const kind = websiteKind(website);
    const rating = parseFloat(r.review_rating || "") || null;
    const reviews = parseInt(r.review_count || "0", 10) || 0;
    const strong = (rating ?? 0) >= 4.3 && reviews >= 50;

    // Instagram / WhatsApp links used as "website" are read from the URL itself: fetching wa.me
    // returns WhatsApp's own page, whose footer links WhatsApp's Instagram, not the business's.
    const site = kind === "vazio" || kind === "instagram" || kind === "whatsapp" || kind === "facebook"
      ? null
      : await checkSite(website, kind === "proprio");
    const socials = findSocials(website + "\n" + (site?.html ?? ""));

    let whatsapp = socials.whatsapp;
    let whatsappSource: EnrichedLead["whatsapp_source"] = whatsapp ? "site" : "";
    if (!whatsapp) {
      whatsapp = brMobileWhatsapp(r.phone);
      if (whatsapp) whatsappSource = "celular";
    }

    // ---- website argument
    let needs = "NÃO" as NeedsSite;
    let siteArg = "";
    const set = (n: NeedsSite, a: string) => { needs = n; siteArg = a; };
    if (kind === "vazio") set("SIM", "Não tem site cadastrado no Google Maps");
    else if (kind === "instagram") set("SIM", "Não tem site: usa o Instagram como site no Google Maps");
    else if (kind === "whatsapp") set("SIM", "Não tem site: o botão 'Site' no Google Maps abre direto o WhatsApp");
    else if (kind === "facebook") set("SIM", "Não tem site: usa o Facebook como site no Google Maps");
    else if (kind === "links") set("SIM", "Não tem site: usa só página de links (Linktree/Heylink)");
    else if (kind === "delivery") set("SIM", `Não tem site próprio: o link é só o cardápio de pedidos (${platformName(website)})`);
    else if (site) {
      if (site.status === "dns") set("SIM", "Site fora do ar: o domínio não responde (pode ter expirado)");
      else if (site.status === "conn") set("SIM", "Site fora do ar: o servidor não responde");
      else if (site.status === "server_error") set("SIM", "Site com erro no servidor (não carrega)");
      else if (site.status === "broken") set("VERIFICAR", "Link de site no Google está quebrado (página não encontrada, erro 404)");
      else if (site.status === "ok" && site.html && !site.mobile) set("SIM", "Site não é adaptado para celular");
    }
    if (needs === "SIM" && strong) {
      siteArg += ` — e tem boa reputação (${repute(rating!, reviews)}): perde clientes que buscam no Google`;
    }

    // ---- marketing / paid traffic arguments
    const mkt: string[] = [];
    if (reviews < 30) mkt.push(`Só ${reviews.toLocaleString("pt-BR")} avaliações no Google: pouca prova social (campanha de avaliações + Google Ads local)`);
    else if (reviews < 100) mkt.push(`${reviews} avaliações, abaixo da média da região (${Math.round(medianReviews).toLocaleString("pt-BR")}): pouca visibilidade`);
    if (rating !== null && rating > 0 && rating < 4.0) mkt.push(`Nota ${br(rating)}: reputação a melhorar (gestão de avaliações)`);
    const hours = (r.open_hours || "").trim();
    if (!hours || hours === "{}" || hours === "null") mkt.push("Perfil do Google sem horário de funcionamento");
    const verifiedSite = kind === "proprio" && site?.status === "ok" && !!site.html;
    if (verifiedSite && !site!.pixel) mkt.push("Site sem Pixel da Meta: não faz remarketing no Instagram/Facebook");
    if (verifiedSite && !site!.analytics) mkt.push("Site sem Google Analytics/Tag Manager: não mede visitas nem conversões");
    if (kind === "delivery") mkt.push(`Já vende online (${platformName(website)}): bom candidato a tráfego pago direto para o cardápio`);
    if (kind === "instagram" || kind === "whatsapp") mkt.push("Todo o tráfego do Google cai no Instagram/WhatsApp, sem medir conversões");
    if (strong && reviews >= 300) mkt.push(`Boa reputação (${repute(rating!, reviews)}): base sólida para escalar com anúncios`);
    if (!(r.descriptions || "").trim()) mkt.push("Perfil do Google sem descrição (SEO local fraco)");

    const trackingGap = verifiedSite && !(site!.pixel && site!.analytics);
    const priority: Priority =
      needs === "SIM" && strong && whatsapp ? "ALTA" : needs !== "NÃO" || trackingGap ? "MÉDIA" : "BAIXA";

    checked++;
    onProgress?.(checked);

    return {
      place_id: (r.place_id || r.cid || "").trim() || null,
      name: (r.title || "").trim() || "(sem nome)",
      category: r.category || "",
      phone: r.phone || "",
      whatsapp,
      whatsapp_source: whatsappSource,
      email: cleanEmails(r.emails || ""),
      instagram: socials.instagram,
      facebook: socials.facebook,
      website,
      website_kind: kind,
      address: r.address || "",
      maps_link: r.link || "",
      rating,
      reviews,
      priority,
      needs_site: needs,
      site_argument: siteArg,
      marketing_arguments: mkt,
      raw: r,
    };
  });
}
