---
version: 1
slug: "crm-src-app-layout-tsx"
primary_target: "crm/src/app/layout.tsx"
related_targets: []
---

# CRM shell (all app routes)

Scope: the whole local CRM app (Início, Leads, Funil, Buscar leads, Configurações, lead drawer). Visitor mode: **Operate**.
Audience/job: agency owner + one friend prospecting local businesses; daily desk work; contact happens on WhatsApp/Instagram.
Constraints: pt-BR; palette purple / dark navy on a dark background (both user-pinned); no branding; no login; build path code-led (no image generation available).
Reference products (user-chosen standing exit): Pipedrive — its craft level is the bar.

## Direction contract

THESIS: The category-standard CRM, played straight at Pipedrive's level of polish, whose one product-specific truth is that every lead carries its sales reason and priority wherever it appears. Refuses novelty skins, neon-on-black dashboards, and gradient glass.

OWN-WORLD: Near-black navy sidebar rail, dark navy work area (user-pinned dark background), slightly lifted navy panels with 1px hairline borders and small radii, violet-purple as the single action/selection color, semantic state colors (green won, red overdue/lost, amber attention), compact priority badges ALTA/MÉDIA/BAIXA, Geist Sans for UI, tabular figures for counts and dates.

STORY: Open Início, see who must be answered today and the best uncontacted leads; open a lead, read why it needs a site or ads, click WhatsApp, log the contact and move the stage; launch new searches from Buscar and watch them import.

FIRST VIEWPORT: Left navy sidebar (nav + scraper status). Main header "Início" with date and primary "Nova busca" button top-right. Row of four KPI cards (no funil, para contatar ALTA, retornos hoje/atrasados, fechados). Below, two panels side by side: Retornos (overdue in red) and Melhores oportunidades (ALTA, still Novo, with reason line and WhatsApp button); stage-count strip under them.

FORM: canon (category standard, Pipedrive idiom), the standing exit chosen by the user; seed key 971878d2. Signature interaction: drag-and-drop kanban plus a right-side lead drawer where one click opens WhatsApp and "Registrar contato" logs it and advances the stage. Motion: drawer slide 200ms ease-out, card lift on drag, nothing ornamental.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
