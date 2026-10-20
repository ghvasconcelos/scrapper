import { getSetting } from "./db";

export function scraperUrl(): string {
  return (getSetting("scraper_url") || process.env.SCRAPER_URL || "http://localhost:8080").replace(/\/+$/, "");
}

async function call(path: string, init?: RequestInit, timeoutMs = 10_000): Promise<Response> {
  const res = await fetch(scraperUrl() + path, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  if (!res.ok) throw new Error(`Scraper respondeu HTTP ${res.status} em ${path}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

export interface ScraperJob {
  ID: string;
  Name: string;
  Date: string;
  Status: "pending" | "working" | "ok" | "failed" | string;
  Data?: { keywords?: string[]; lat?: string; lon?: string; depth?: number; email?: boolean; max_time?: number };
}

export async function scraperOnline(): Promise<boolean> {
  try {
    await call("/api/v1/jobs", undefined, 3000);
    return true;
  } catch {
    return false;
  }
}

export async function listJobs(): Promise<ScraperJob[]> {
  return ((await (await call("/api/v1/jobs")).json()) as ScraperJob[] | null) ?? [];
}

export async function getJob(id: string): Promise<ScraperJob> {
  return (await call(`/api/v1/jobs/${id}`)).json();
}

export async function createJob(body: {
  name: string; keywords: string[]; lat: string; lon: string; depth: number;
  email: boolean; max_time: number; lang?: string; zoom?: number; radius?: number;
}): Promise<string> {
  const res = await call("/api/v1/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lang: "pt", zoom: 15, radius: 10000, fast_mode: false, ...body }),
  });
  const { id } = (await res.json()) as { id?: string };
  if (!id) throw new Error("O scraper não devolveu o id do job.");
  return id;
}

export async function downloadCsv(id: string): Promise<string> {
  return (await call(`/api/v1/jobs/${id}/download`, undefined, 60_000)).text();
}

export async function deleteJob(id: string): Promise<void> {
  await call(`/api/v1/jobs/${id}`, { method: "DELETE" });
}

/** OpenStreetMap Nominatim; one request per search, well inside its usage policy. */
export async function geocode(place: string): Promise<{ lat: string; lon: string; label: string } | null> {
  const url = "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({ q: place, format: "json", limit: "1", countrycodes: "br", "accept-language": "pt-BR" });
  const res = await fetch(url, {
    headers: { "User-Agent": "crm-prospeccao-local/1.0 (google-maps-scraper-kit)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return hit ? { lat: hit.lat, lon: hit.lon, label: hit.display_name } : null;
}
