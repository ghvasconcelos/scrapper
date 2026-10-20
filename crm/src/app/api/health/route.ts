import { json } from "@/lib/http";
import { scraperOnline, scraperUrl } from "@/lib/scraper";

export async function GET() {
  return json({ scraper: await scraperOnline(), url: scraperUrl() });
}
