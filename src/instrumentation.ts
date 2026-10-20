export async function register() {
  // Na Vercel não há scraper: quem acompanha e importa as buscas é o CRM aberto no computador com o Docker.
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { startWorker } = await import("./lib/searches");
    startWorker();
  }
}
