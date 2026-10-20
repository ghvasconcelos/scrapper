---
name: Prospecção CRM
description: A conventional dark-navy sales CRM where every lead carries its sales reason and priority.
colors:
  navy-950: "#080a1d"
  navy-900: "#12163a"
  navy-800: "#1d2257"
  navy-700: "#2c3270"
  rail-text: "#c3c6ea"
  rail-muted: "#8e93c4"
  ground: "#0d1029"
  panel: "#151937"
  panel-sunk: "#1b2044"
  panel-raised: "#1f2550"
  field: "#10142f"
  line: "#262b53"
  line-strong: "#373d6e"
  ink: "#ebecfa"
  ink-2: "#b8bbdf"
  ink-3: "#9094bf"
  neutral-tint: "#232850"
  violet: "#6b4bf5"
  violet-hover: "#7a5cff"
  violet-press: "#5a3be0"
  violet-tint: "rgba(124, 96, 255, 0.16)"
  violet-tint-2: "rgba(124, 96, 255, 0.32)"
  violet-ink: "#b9a9ff"
  green: "#3fcf95"
  green-tint: "rgba(63, 207, 149, 0.14)"
  red: "#ff6f78"
  red-solid: "#d93a45"
  red-tint: "rgba(255, 111, 120, 0.14)"
  amber: "#f4b856"
  amber-tint: "rgba(244, 184, 86, 0.14)"
  wa: "#13804b"
  wa-hover: "#17965a"
  wa-ink: "#45d48c"
typography:
  headline:
    fontFamily: "Geist, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  metric:
    fontFamily: "Geist, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  body:
    fontFamily: "Geist, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  control:
    fontFamily: "Geist, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
  label:
    fontFamily: "Geist, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
  badge:
    fontFamily: "Geist, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
    letterSpacing: "0.01em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, Cascadia Mono, monospace"
    fontSize: "11.5px"
rounded:
  s: "4px"
  m: "6px"
  l: "10px"
  pill: "14px"
spacing:
  xs: "4px"
  s: "8px"
  m: "14px"
  l: "18px"
  page-x: "28px"
components:
  button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.m}"
    padding: "0 13px"
    height: "34px"
  button-hover:
    backgroundColor: "{colors.panel-sunk}"
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "#ffffff"
    typography: "{typography.control}"
    rounded: "{rounded.m}"
    padding: "0 13px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.violet-hover}"
  button-primary-active:
    backgroundColor: "{colors.violet-press}"
  button-whatsapp:
    backgroundColor: "{colors.wa}"
    textColor: "#ffffff"
    rounded: "{rounded.m}"
    height: "34px"
  button-whatsapp-hover:
    backgroundColor: "{colors.wa-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.m}"
    height: "34px"
  button-sm:
    typography: "{typography.label}"
    padding: "0 9px"
    height: "28px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.m}"
    padding: "0 10px"
    height: "34px"
  chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 11px"
    height: "28px"
  chip-selected:
    backgroundColor: "{colors.violet-tint}"
    textColor: "{colors.violet-ink}"
  badge-alta:
    backgroundColor: "{colors.amber}"
    textColor: "#1a1205"
    typography: "{typography.badge}"
    rounded: "{rounded.s}"
    padding: "0 7px"
    height: "20px"
  badge-media:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.amber}"
    typography: "{typography.badge}"
    rounded: "{rounded.s}"
    height: "20px"
  badge-baixa:
    backgroundColor: "{colors.neutral-tint}"
    textColor: "{colors.ink-2}"
    typography: "{typography.badge}"
    rounded: "{rounded.s}"
    height: "20px"
  badge-won:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green}"
    rounded: "{rounded.s}"
    height: "20px"
  badge-lost:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.red}"
    rounded: "{rounded.s}"
    height: "20px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.l}"
    padding: "14px 16px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.rail-text}"
    rounded: "{rounded.m}"
    padding: "8px 10px"
  nav-link-active:
    backgroundColor: "{colors.navy-800}"
    textColor: "#ffffff"
---

# Design System: Prospecção CRM

## Overview

**Creative North Star: "The Night-Shift Pipeline"**

A category-standard sales CRM in the Pipedrive idiom, played straight and dark. A near-black navy rail holds navigation and system status; the work area is a dark navy ground carrying slightly lifted navy panels outlined in 1px hairlines. Nothing in the chrome competes with the data: one violet marks what you can act on or what is selected, and the remaining color is semantic, reserved for priority, overdue, won and lost.

The product's single specific truth is visible everywhere a lead appears: a compact priority badge (ALTA / MÉDIA / BAIXA) and a one-line sales reason travel with the lead name in lists, tables, kanban cards and the drawer. Density is desk-work density: 14px body, 34px controls, 46px table rows, tabular figures for every count, date and money value.

Motion is functional only: the lead drawer slides in from the right, cards tilt slightly while dragged, toasts rise. There is no ornamental animation, no gradient glass, and no neon-on-black.

**Key Characteristics:**
- Dark navy layering (rail darker than ground, panels lighter than ground), 1px hairline borders.
- One action color (violet); semantic colors carry state, never decoration.
- Priority badge + sales reason on every lead representation.
- Geist Sans throughout, tabular figures for numbers, sentence case pt-BR labels.
- Small radii (4 / 6 / 10px), soft dark offset shadows.

## Colors

A dark navy ramp for structure, one saturated violet for action, and four semantic hues for state.

### Primary
- **Signal Violet** (`violet`): the only action and selection color. Primary buttons ("Nova busca", "Registrar contato"), focus rings, caret, checkbox accent, progress fill, the active rail icon, selected chips and segmented buttons (as `violet-tint` background with `violet-ink` text), selected table rows (`violet-tint`), drop-target kanban lanes, KPI card hover border. `violet-hover` and `violet-press` are its only state shifts.
- **Lavender Ink** (`violet-ink`): violet as text on dark: links, "hoje" due dates, selected-chip labels.

### Secondary (semantic state)
- **Priority Amber** (`amber`): attention. Solid fill with near-black text for ALTA; `amber-tint` with amber text for MÉDIA, "Verificar site", notes in the timeline and warnings; a 1px amber outline (no fill) for "Precisa de site".
- **Overdue Red** (`red`, `red-solid`): overdue follow-ups ("atrasado N dias"), lost stage, failed searches, destructive hover, error toasts (`red-solid` fill), the overdue count pill on the rail.
- **Won Green** (`green`): won stage, "Tem site", completed searches.
- **WhatsApp Green** (`wa`, `wa-ink`): the WhatsApp send action and WhatsApp channel marks only. It is darker than Won Green so white button text stays legible.

### Neutral
- **Rail Night** (`navy-950`): the sidebar rail; `navy-900` / `navy-800` / `navy-700` are its hover, active and field steps.
- **Desk Navy** (`ground`): page background and drawer body.
- **Lifted Navy** (`panel`): panels, KPI cards, kanban cards, buttons at rest, drawer head. `panel-sunk` is hover and table headers; `panel-raised` is pressed, ghost hover and toasts; `field` is input wells and kanban lanes.
- **Hairline** (`line`, `line-strong`): `line` divides rows and outlines panels; `line-strong` outlines interactive controls.
- **Ink** (`ink`, `ink-2`, `ink-3`): primary text, secondary text and labels, tertiary meta and placeholders.
- **Neutral Tint** (`neutral-tint`): BAIXA and in-progress stage badges, count pills, empty progress tracks.

Pipeline stages use a categorical data palette (slate, blue, cyan, violet, deep violet; won green, lost red) for stage dots, the stage strip and kanban column markers. These hues are data identity, never UI chrome.

### Named Rules
**The One Voice Rule.** Violet means "act here" or "this is selected". It never decorates, never labels a category, and never appears as a gradient.

**The Earned Red Rule.** Red appears only when something is overdue, lost, failed or destructive. A screen with nothing late shows no red.

**The Two Greens Rule.** Won Green reports an outcome; WhatsApp Green opens a conversation. Don't swap them.

## Typography

**UI Font:** Geist Sans (with system-ui, -apple-system, Segoe UI)
**Mono Font:** Geist Mono (with ui-monospace, Cascadia Mono), only for template variables and code.

**Character:** One neutral grotesque at tight, desk-scale sizes. Hierarchy comes from weight (600 for names and headings, 500 for controls and labels) more than size.

### Hierarchy
- **Headline** (600, 21px, -0.01em): page titles ("Início", "Leads"); paired with a 13.5px `ink-3` subtitle on the same line.
- **Drawer title** (600, 19px, 1.25): the lead name in the drawer.
- **Metric** (600, 28px, 1.1, -0.02em, tabular): KPI values; 24px on mobile.
- **Title** (600, 14.5px): panel headings; kanban column heads 13.5px; drawer section heads 13px in `ink-2`.
- **Body** (400, 14px, 1.45): default text. Lead names in rows are 600.
- **Control** (500, 13.5px): buttons, inputs, table cells.
- **Label / meta** (500 or 400, 12.5px): field labels, hints, due dates, table headers (600), row subtitles.
- **Badge** (600, 11.5px, 0.01em): priority and status badges. ALTA / MÉDIA / BAIXA are uppercase because they are data values; all other labels are sentence case.

### Named Rules
**The Tabular Rule.** Every count, date, rating, money value and KPI uses tabular figures, so columns of numbers align.

**The Sentence-Case Rule.** Headings, buttons and labels are pt-BR sentence case. No uppercase tracking labels above headings.

## Layout

A fixed two-column shell: a 232px sticky rail and a fluid main column. Pages pad 22px top, 28px sides, 40px bottom, stacking sections with an 18px gap; panels and grid gutters use 14px. The rhythm runs on 4 / 8 / 14 / 18px steps.

- **Início:** a four-up KPI strip, then two independent column stacks (no row-locked voids).
- **Leads:** toolbar (280px search, selects capped at 190px) above a full-width data table whose header is sticky inside a scroll container; a violet bulk-action bar appears on selection.
- **Funil:** horizontally scrolling kanban, columns `minmax(262px, 1fr)`, filling the viewport height; a right-edge fade mask signals more columns.
- **Buscar / Configurações:** a 440px form column beside a fluid results column; Buscar's launch controls stick to the bottom of the form panel.
- **Drawer:** fixed right sheet, `min(560px, 100vw)`, over a dark scrim.

Breakpoints: at 1180px KPIs go two-up and form/result splits stack; at 900px Início's two stacks collapse; at 760px the rail becomes a sticky top bar with icon-only links, page padding drops to 16px, the search field goes full width and table height is uncapped.

## Elevation & Depth

Depth is mostly tonal: rail darker than ground, panels lighter than ground, hover one step lighter again. Soft, dark, offset shadows add a small lift, scaled to how far an element floats. Shadows are never colored and never hard-edged.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 1px 2px rgba(0,0,0,0.35)`): panels, KPI cards, kanban cards, primary buttons.
- **Lift** (`box-shadow: 0 8px 20px -6px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.3)`): hover on KPI cards and kanban cards.
- **Overlay** (`box-shadow: 0 24px 60px -12px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.35)`): the drawer and toasts.

### Named Rules
**The Lift-On-Intent Rule.** Surfaces sit at Rest; Lift appears only on hover over something clickable or draggable; Overlay is reserved for things above the page.

## Shapes

Small, consistent radii: 4px for badges, segmented buttons and code chips; 6px for buttons, inputs, nav links and inline notices; 10px for panels, KPI cards, kanban lanes, drawer sections and the table container. Filter chips and count pills are fully rounded. Every container has a 1px border: `line` for surfaces, `line-strong` for controls. Icons are Lucide outline at 2px stroke, with hand-drawn Instagram/Facebook glyphs in the same stroke language.

## Components

### Buttons
Compact, quiet, and unambiguous about which one is the main action.
- **Shape:** 6px radius, 34px tall (28px small), 13px horizontal padding, icon + label with a 7px gap.
- **Default:** `panel` fill, `line-strong` border, `ink` text; hover moves to `panel-sunk` with an `ink-3` border.
- **Primary:** violet fill and border, white text, Rest shadow; hover `violet-hover`, press `violet-press`. One per view region.
- **WhatsApp:** `wa` fill, white text; only for sending a WhatsApp message.
- **Ghost:** transparent, `ink-2` text, `panel-raised` on hover; used for "Ver todos" style links and close buttons.
- **Danger:** default button with red text; red border and `red-tint` fill on hover.
- **Focus:** 2px violet outline, 2px offset. Transitions 120ms on background, border and shadow.

### Chips
- **Style:** fully rounded, 28px, `panel` fill, `line-strong` border, `ink-2` text.
- **Selected:** `violet-tint` fill, violet border, `violet-ink` text. Used for search presets and filters.
- **Segmented control:** a 6px bordered track with 4px inner buttons; pressed state uses the same violet tint.

### Badges
- **Priority:** ALTA solid amber, MÉDIA amber tint, BAIXA neutral tint; 20px tall, 4px radius, 11.5px semibold.
- **Site status:** "Precisa de site" amber outline, "Verificar site" amber tint, "Tem site" green tint.
- **Stage:** neutral tint at weight 500; won green tint, lost red tint.
- **Due date:** plain text, not a badge: `ink-2` by default, bold red when overdue, bold `violet-ink` for today.

### Cards / Containers
- **Panels:** `panel` fill, 1px `line` border, 10px radius, Rest shadow; header row 13px/16px padding with a hairline divider, body 14px/16px.
- **KPI cards:** panel styling, clickable; hover gives a violet border and Lift. An alert KPI turns its value red and its border to a translucent red.
- **List rows:** 10px/16px padding, hairline separators, `panel-sunk` hover; name + badge on top, reason line in `ink-2` below, rating and WhatsApp action on the right.

### Inputs / Fields
- **Style:** `field` well, 1px `line-strong` border, 6px radius, 34px; placeholder `ink-3`; custom chevron for selects, inline magnifier for search.
- **Hover:** border goes to `ink-3`.
- **Focus:** violet border plus a 3px `violet-tint-2` ring, no outline.
- **Labels:** 12.5px, 500, `ink-2`, 5px above the field.

### Navigation
- **Rail:** `navy-950`, links 8px/10px with 17px icons and 11px gap, `rail-text` color. Hover `navy-900` with white text; active `navy-800`, white text, a 1px inset violet hairline and a `violet-ink` icon. The Início link carries a red overdue count pill.
- **Foot:** user picker select and scraper status dot (green online, red offline).
- **Mobile:** the rail becomes a sticky horizontal top bar; labels and counts hide, icons remain.

### Data Table
Sticky `panel-sunk` header, 36px, 12.5px semibold `ink-2` with sortable header buttons; 46px rows with hairline separators; `panel-sunk` hover; selected rows `violet-tint`; row focus a 2px inset violet outline. Name cells stack a bold name over a 12px `ink-3` subtitle; reason cells clamp to two lines. Contact links are 28px icon buttons (WhatsApp in `wa-ink`, Instagram pink, missing channels dimmed to `line-strong`).

### Kanban Board (signature)
Lanes are `field`-colored with a hairline border and 10px radius; header shows a stage color dot, name, count pill and tabular value sum. Cards are `panel` with Rest shadow, grab cursor, Lift on hover; while dragged a card drops to 45% opacity and tilts 1.2deg at 0.98 scale. Empty lanes are quiet at rest (centered `ink-3` text, transparent dashed border); during a drag every empty lane shows a `line-strong` dashed outline, and the lane under the pointer fills with `violet-tint` and a 2px inset violet ring.

### Lead Drawer (signature)
Right sheet on `ground` with Overlay shadow, sliding 32px in from the right with a fade over 220ms on `cubic-bezier(0.16, 1, 0.3, 1)`; scrim fades over 160ms. A `panel` header holds the name, badges and stage/owner/follow-up controls; the body stacks bordered sections (why it needs a site, contact actions with the WhatsApp button first, details, timeline). The WhatsApp message preview is a dark green bubble with one squared corner. Timeline icons are 26px circles tinted by type (WhatsApp green, note amber, system plain).

### Toasts
Bottom-center stack, `panel-raised` with `line-strong` border, 13.5px, Overlay shadow, rising 10px over 220ms; errors switch to a solid `red-solid` fill with white text.

## Do's and Don'ts

### Do:
- **Do** use violet (#6b4bf5) for the single primary action per region and for every selected or focused state.
- **Do** show the priority badge and the one-line sales reason next to the lead name wherever a lead appears.
- **Do** use tabular figures for counts, dates, ratings and money, formatted pt-BR (comma decimals, "atrasado 3 dias", "qui, 9 out").
- **Do** build depth from the navy ramp first and the three-step shadow vocabulary second.
- **Do** keep radii on the 4 / 6 / 10px scale and every surface outlined by a 1px hairline.
- **Do** keep empty states quiet: one bold line plus one `ink-3` sentence, and outline empty kanban lanes only while a drag is in progress.

### Don't:
- **Don't** use red for anything that is not overdue, lost, failed or destructive.
- **Don't** use violet as decoration, as a category color, or in gradients.
- **Don't** use the WhatsApp green for "won", or Won Green on the WhatsApp action.
- **Don't** add uppercase tracking labels above headings; ALTA / MÉDIA / BAIXA are the only uppercase text, and only as badges.
- **Don't** use neon-on-black accents, glows, glassmorphism or gradient surfaces.
- **Don't** use hard offset or colored shadows.
- **Don't** add ornamental motion; animate only the drawer, scrim, toasts, drag feedback and progress.
