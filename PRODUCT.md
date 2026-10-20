# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, TypeScript), chosen by the user. Runs locally on the owner's Windows PC (`localhost`), with a local SQLite database. The local Google Maps scraper (Docker, `http://localhost:8080`) is the lead source. Online deployment (Vercel + Supabase) is a possible later step, not a current requirement.

## Users

The owner of a small web agency that sells websites and paid-traffic/marketing services, plus one friend who prospects alongside them. Both use the same CRM screen on the owner's PC; there is no login and no per-user account. They prospect local businesses (first test: food businesses in Anápolis/GO, Brazil) and contact them mostly by WhatsApp and Instagram.

## Product Purpose

Turn Google Maps scrapes into a working sales pipeline: launch a scrape for a segment + city, import the results as leads with contact channels and ready-made sales arguments, then work each lead through the funnel until it closes or is lost. Success is fewer leads falling through the cracks and faster first contact with the businesses most likely to buy a site or marketing.

## Positioning

The CRM knows *why* each lead needs the agency before the first message: every lead arrives with concrete, checked reasons (no website, Instagram used as website, website offline, link only to a delivery menu, no Meta Pixel/Analytics, few Google reviews) and a priority derived from them. Generic CRMs store contacts; this one ranks prospects by sales opportunity.

## Operating Context

- Daily desk work on a desktop browser; the scraper runs in Docker on the same PC.
- Pipeline stages: Novo → Contatado → Respondeu → Reunião → Proposta → Fechado / Perdido (editable later).
- First contact happens outside the CRM (WhatsApp Web / Instagram); the CRM opens those channels and records what happened.
- Scrapes take minutes (search + website visits); the CRM must show progress and import automatically when done.
- Language: Brazilian Portuguese (pt-BR) throughout.

## Capabilities and Constraints

- Lead fields: name, category, phone, WhatsApp (confirmed from an official link vs. likely from a mobile number), e-mail, Instagram, Facebook, Google "website" link, address, rating, review count.
- Sales arguments per lead: website argument (needs a site? why) and marketing/paid-traffic arguments; priority ALTA / MÉDIA / BAIXA.
- Instagram is only found when the business links it; most businesses without a site have no Instagram on record. Many WhatsApp numbers are inferred from mobile numbers and must be labeled as likely, never as confirmed.
- Scraped contacts are business data subject to LGPD; outreach must allow opt-out. No spam tooling.
- Google rate-limits heavy scraping; the UI warns on big jobs but does not block them.
- No authentication (local, two trusted users). The scraper API must stay bound to localhost.

## Brand Commitments

No agency branding for now. Binding visual constraints from the user: the palette is purple / dark navy blue ("roxo / azul escuro"), on a dark background ("fundo escuro"). Standing visual preference: the conventional CRM look in the style of Pipedrive (chosen over bespoke directions), executed at that product's level of polish.

## Evidence on Hand

- Real scrape output: `leads-gastronomia-anapolis.csv` (139 food businesses in Anápolis/GO, with sales arguments) and the job still stored in the scraper.
- No customers, testimonials, logos, or metrics exist; none may be invented.

## Product Principles

1. Opportunity first: the most sellable leads surface before the rest, with the reason visible at a glance.
2. Honest data: every inferred value (likely WhatsApp, unverified site status) is labeled as such.
3. One click to the conversation: WhatsApp, Instagram and the site open directly from the lead.
4. Never lose a follow-up: next-contact dates and stage changes are always visible.
5. Scraping is a means, not the product: launching a search should take seconds and need no technical knowledge.
