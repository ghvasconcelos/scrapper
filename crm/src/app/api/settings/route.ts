import { getSetting, setSetting } from "@/lib/db";
import { fail, json } from "@/lib/http";

function readSettings() {
  return {
    team: getSetting("team", "").split(",").map((s) => s.trim()).filter(Boolean),
    scraper_url: getSetting("scraper_url", ""),
  };
}

export async function GET() {
  return json(readSettings());
}

export async function PUT(req: Request) {
  const body = (await req.json()) as { team?: string[]; scraper_url?: string };
  if (body.team) setSetting("team", body.team.map((s) => s.trim()).filter(Boolean).join(","));
  if (body.scraper_url !== undefined) {
    const url = body.scraper_url.trim();
    if (url && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) {
      return fail("Use um endereço local, por exemplo http://localhost:8080. O scraper não tem senha e não deve ficar exposto.");
    }
    setSetting("scraper_url", url);
  }
  return json(readSettings());
}
