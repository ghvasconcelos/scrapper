import { getSetting, setSetting } from "@/lib/db";
import { fail, json } from "@/lib/http";

async function readSettings() {
  const [team, scraperUrl] = await Promise.all([getSetting("team", ""), getSetting("scraper_url", "")]);
  return {
    team: team.split(",").map((s) => s.trim()).filter(Boolean),
    scraper_url: scraperUrl,
  };
}

export async function GET() {
  return json(await readSettings());
}

export async function PUT(req: Request) {
  const body = (await req.json()) as { team?: string[]; scraper_url?: string };
  if (body.team) await setSetting("team", body.team.map((s) => s.trim()).filter(Boolean).join(","));
  if (body.scraper_url !== undefined) {
    const url = body.scraper_url.trim();
    if (url && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) {
      return fail("Use um endereço local, por exemplo http://localhost:8080. O scraper não tem senha e não deve ficar exposto.");
    }
    await setSetting("scraper_url", url);
  }
  return json(await readSettings());
}
