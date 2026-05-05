---
version: merged
name: Rafli
description: Fair, transparent, on-chain raffles. A warm cream canvas, Rafli-Black CTAs, and a pastel accent trio (yellow / green / blue) anchored by Clash Display headlines and fully-pilled controls.
colors:
  # --- Core brand ---
  background: '#f9f8f4'
  foreground: '#1c1917'
  rafli-black: '#141416'
  white: '#ffffff'
  # --- Shadcn tokens (semantic, used in component code) ---
  primary: '#00b8ff'
  primary-foreground: '#fafaf9'
  secondary: '#f5f5f4'
  secondary-foreground: '#292524'
  muted: '#f5f5f4'
  muted-foreground: '#78716c'
  accent: '#f5f5f4'
  accent-foreground: '#292524'
  card: '#ffffff'
  card-foreground: '#1c1917'
  popover: '#ffffff'
  popover-foreground: '#1c1917'
  destructive: '#dc2626'
  border: '#e7e5e4'
  input: '#b4b4b4'
  ring: '#a8a29e'
  # --- Accent trio (always used as a set) ---
  rafli-blue: '#c4edff'
  rafli-green: '#beffdb'
  rafli-yellow: '#f6ff8b'
  # --- Neutral ramp ---
  ink: '#182135'
  gray-500: '#7b7b7b'
  gray-400: '#b4b4b4'
  gray-200: '#e5e5e5'
  gray-150: '#e6e8ec'
  gray-100: '#f1f3f5'
  gray-75: '#eeeeee'
  gray-50: '#f4f4f4'
  # --- Extended accents (product UI) ---
  green-light: '#dfffed'
  green-600: '#44b476'
  green-live: '#13e36f'
  green-bright: '#86ffae'
  gold: '#998b53'
  yellow-light: '#faffc4'
  yellow-warm: '#f9ffb5'
  yellow-pale: '#fffbeb'
  cyan: '#84dcff'
  blue-light: '#e1f8ff'
  red: '#e5484d'
  # --- Status pill palette ---
  status-live: '#22c55e'
  status-scheduled: '#3b82f6'
  status-ended: '#9ca3af'
  status-completed: '#a855f7'
  status-auto-cancelled: '#f97316'
  status-cancelled: '#ef4444'
typography:
  display-hero:
    {
      fontFamily: Clash Display,
      fontSize: 'clamp(56px, 10vw, 120px)',
      fontWeight: 600,
      lineHeight: 1.0,
      letterSpacing: -0.03em,
    }
  display-hero-mobile:
    {
      fontFamily: Clash Display,
      fontSize: 60px,
      fontWeight: 600,
      lineHeight: 1.0,
    }
  display-section:
    {
      fontFamily: Clash Display,
      fontSize: 'clamp(32px, 5vw, 72px)',
      fontWeight: 600,
      lineHeight: 1.05,
      letterSpacing: 0.8px,
    }
  display-section-mobile:
    {
      fontFamily: Clash Display,
      fontSize: 36px,
      fontWeight: 600,
      lineHeight: 1.05,
    }
  display-browse:
    {
      fontFamily: Clash Display,
      fontSize: 'clamp(36px, 5vw, 52px)',
      fontWeight: 600,
      lineHeight: 1.0,
    }
  headline-lg:
    {
      fontFamily: Clash Display,
      fontSize: 40px,
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: 0.4px,
    }
  headline-md:
    {
      fontFamily: Clash Display,
      fontSize: 30px,
      fontWeight: 600,
      lineHeight: 1.15,
    }
  headline-sm:
    {
      fontFamily: Clash Display,
      fontSize: 24px,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: 0.12px,
    }
  body-lg:
    {
      fontFamily: Geist Sans,
      fontSize: 18px,
      fontWeight: 500,
      lineHeight: 32px,
    }
  body-md:
    {
      fontFamily: Geist Sans,
      fontSize: 15px,
      fontWeight: 400,
      lineHeight: 28px,
    }
  body-sm:
    {
      fontFamily: Geist Sans,
      fontSize: 14px,
      fontWeight: 400,
      lineHeight: 24px,
    }
  card-title:
    { fontFamily: Geist Sans, fontSize: 15px, fontWeight: 600, lineHeight: 1.2 }
  card-price:
    {
      fontFamily: Clash Display,
      fontSize: 19px,
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: 0.1px,
    }
  caption:
    { fontFamily: Geist Sans, fontSize: 13px, fontWeight: 500, lineHeight: 1.2 }
  label-md:
    { fontFamily: Geist Sans, fontSize: 14px, fontWeight: 500, lineHeight: 1.0 }
  label-sm:
    {
      fontFamily: Geist Sans,
      fontSize: 12px,
      fontWeight: 600,
      lineHeight: 1.0,
      letterSpacing: 0.02em,
    }
  countdown-digit:
    {
      fontFamily: Clash Display,
      fontSize: 36px,
      fontWeight: 600,
      lineHeight: 1.0,
      letterSpacing: -0.01em,
    }
  mono-md:
    { fontFamily: Geist Mono, fontSize: 14px, fontWeight: 400, lineHeight: 1.5 }
rounded:
  md: 0.5rem
  lg: 0.75rem
  xl: 1.25rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 80px
  page-padding-mobile: 24px
  page-padding-desktop: 48px
  app-padding-mobile: 24px
  app-padding-desktop: 32px
  section-padding-y: 80px
  navbar-height-app: 56px
  navbar-height-landing: 64px
  navbar-padding-x-mobile: 24px
  navbar-padding-x-desktop: 48px
  container-landing-max: 1200px
  container-app-max: 1200px
  card-padding: 14px
  card-gap: 16px
  grid-min-col: 240px
  breakpoint-sm: 640px
  breakpoint-md: 768px
  breakpoint-lg: 1024px
  breakpoint-xl: 1280px
  breakpoint-2xl: 1536px
components:
  # ── Primitives ──
  atom-input:
    {
      backgroundColor: transparent,
      textColor: '{colors.foreground}',
      typography: '{typography.body-md}',
      rounded: '{rounded.md}',
      height: 36px,
      padding: 4px 12px,
    }
  atom-status-dot:
    {
      backgroundColor: '{colors.green-live}',
      size: 8px,
      rounded: '{rounded.full}',
    }
  atom-focus-ring: { size: 3px, backgroundColor: '{colors.ring}' }
  atom-progress-track:
    { backgroundColor: '#f3f4f6', rounded: '{rounded.full}', height: 11px }
  atom-progress-fill:
    { backgroundColor: '{colors.primary}', rounded: '{rounded.full}' }
  # ── Buttons ──
  button-primary:
    {
      backgroundColor: '{colors.rafli-black}',
      textColor: '{colors.white}',
      typography: '{typography.label-md}',
      rounded: '{rounded.full}',
      height: 36px,
      padding: 0 16px,
    }
  button-primary-hover:
    { backgroundColor: '{colors.white}', textColor: '{colors.rafli-black}' }
  button-primary-lg:
    {
      backgroundColor: '{colors.rafli-black}',
      textColor: '{colors.white}',
      rounded: '{rounded.full}',
      height: 40px,
      padding: 0 24px,
    }
  button-primary-sm:
    {
      backgroundColor: '{colors.rafli-black}',
      textColor: '{colors.white}',
      rounded: '{rounded.full}',
      height: 32px,
      padding: 0 12px,
    }
  button-cta:
    {
      backgroundColor: '{colors.rafli-black}',
      textColor: '{colors.white}',
      typography: '{typography.body-lg}',
      rounded: 10px,
      height: 60px,
      padding: '0 32px',
      borderWidth: 1px,
      borderColor: '{colors.rafli-black}',
    }
  button-cta-hover:
    { backgroundColor: '{colors.white}', textColor: '{colors.rafli-black}' }
  button-outline:
    {
      backgroundColor: '{colors.white}',
      textColor: '{colors.foreground}',
      rounded: '{rounded.full}',
      height: 36px,
      padding: '0 16px',
      borderWidth: 1px,
      borderColor: '{colors.rafli-black}',
    }
  button-ghost:
    {
      backgroundColor: transparent,
      textColor: '{colors.foreground}',
      rounded: '{rounded.full}',
      height: 36px,
      padding: 0 16px,
    }
  button-destructive:
    {
      backgroundColor: '{colors.destructive}',
      textColor: '{colors.white}',
      rounded: '{rounded.full}',
      height: 36px,
      padding: 0 16px,
    }
  button-icon:
    { backgroundColor: transparent, rounded: '{rounded.full}', size: 36px }
  # ── Badges ──
  badge-default:
    {
      backgroundColor: '{colors.rafli-black}',
      textColor: '{colors.white}',
      typography: '{typography.label-sm}',
      rounded: '{rounded.full}',
      padding: 2px 10px,
    }
  badge-secondary:
    {
      backgroundColor: '{colors.secondary}',
      textColor: '{colors.secondary-foreground}',
      typography: '{typography.label-sm}',
      rounded: '{rounded.full}',
      padding: 2px 10px,
    }
  badge-outline:
    {
      backgroundColor: transparent,
      textColor: '{colors.foreground}',
      rounded: '{rounded.full}',
      padding: 2px 10px,
    }
  badge-best-value:
    {
      backgroundColor: '{colors.primary}',
      textColor: '#121211',
      typography: '{typography.label-sm}',
      rounded: '{rounded.lg}',
      padding: 2px 8px,
    }
  badge-new-this-week:
    {
      backgroundColor: '{colors.green-live}',
      textColor: '#121211',
      typography: '{typography.label-sm}',
      rounded: '{rounded.lg}',
      padding: 2px 8px,
    }
  role-pill-host:
    {
      backgroundColor: '{colors.yellow-light}',
      textColor: '{colors.gold}',
      typography: '{typography.label-sm}',
      rounded: 8px,
      padding: '2px 10px',
    }
  role-pill-participant:
    {
      backgroundColor: '{colors.rafli-green}',
      textColor: '{colors.green-600}',
      typography: '{typography.label-sm}',
      rounded: 8px,
      padding: '2px 10px',
    }
  status-pill-live:
    {
      backgroundColor: '{colors.background}',
      textColor: '{colors.foreground}',
      typography: '{typography.label-sm}',
      rounded: '{rounded.full}',
      padding: '4px 10px',
    }
  verified-host-badge:
    {
      backgroundColor: transparent,
      textColor: '#121211',
      fontFamily: Geist Sans,
      fontSize: 12px,
      rounded: 10px,
      padding: '2px 4px',
      gap: 4px,
      borderWidth: 1px,
      borderColor: '#000000',
      iconSize: 14px,
      iconName: CheckCircle,
    }
  # ── Cards ──
  card-raffle:
    {
      backgroundColor: '{colors.card}',
      textColor: '{colors.card-foreground}',
      rounded: '{rounded.xl}',
      padding: '{spacing.card-padding}',
      borderWidth: 1px,
      borderColor: transparent,
    }
  card-raffle-hover: { borderWidth: 1px, borderColor: '{colors.rafli-black}' }
  card-featured:
    {
      backgroundColor: '{colors.card}',
      rounded: '{rounded.xl}',
      padding: 24px,
      borderWidth: 1px,
      borderColor: transparent,
    }
  card-winner:
    { backgroundColor: '{colors.card}', rounded: '{rounded.xl}', padding: 16px }
  card-past-draw:
    { backgroundColor: '{colors.card}', rounded: '{rounded.xl}', padding: 16px }
  card-content:
    { backgroundColor: '{colors.card}', rounded: '{rounded.xl}', padding: 24px }
  card-subscription-plan:
    { backgroundColor: '{colors.card}', rounded: '{rounded.xl}', padding: 24px }
  # ── Organisms ──
  countdown-timer:
    {
      backgroundColor: '{colors.rafli-yellow}',
      textColor: '{colors.foreground}',
      typography: '{typography.countdown-digit}',
      rounded: '{rounded.xl}',
      padding: 16px,
      borderWidth: 1px,
      borderColor: '{colors.rafli-black}',
    }
  navbar:
    {
      backgroundColor: '{colors.background}',
      textColor: '{colors.foreground}',
      height: 56px,
      padding: '0 24px',
    }
  navbar-landing:
    {
      backgroundColor: '{colors.background}',
      textColor: '{colors.foreground}',
      height: 64px,
      padding: '0 48px',
    }
  navbar-public: { backgroundColor: '{colors.background}', height: 64px }
  mobile-nav-overlay:
    {
      backgroundColor: '{colors.rafli-green}',
      textColor: '{colors.rafli-black}',
      typography: '{typography.display-section-mobile}',
    }
  footer:
    {
      backgroundColor: '{colors.background}',
      textColor: '{colors.foreground}',
      typography: '{typography.body-lg}',
    }
  search-bar:
    {
      backgroundColor: '{colors.white}',
      rounded: '{rounded.full}',
      height: 40px,
      padding: 0 16px,
    }
  selection-card:
    {
      backgroundColor: '{colors.white}',
      rounded: '{rounded.lg}',
      height: 56px,
      padding: 0 16px,
    }
---

# Rafli Design System

> Tokens authored in `src/app/globals.css` (Tailwind CSS v4, CSS-first config). This document mirrors those tokens in portable form and adds prose context for decisions not codified in tokens.

## Brand & Style

Rafli is a fair, transparent raffle platform for on-chain prize draws, a subsidiary of the EARN'M Foundation, domain [rafli.win](https://www.rafli.win), tagline **"Fair Raffles & Real Prizes."**

The identity sits at the intersection of four traits:

- **Trustworthy** — Verified draws, transparent process, blockchain-backed.
- **Playful** — Pastel accent trio, rounded shapes, animated reveals.
- **Modern** — Clean typography, generous whitespace, minimal chrome.
- **Accessible** — Simple language, clear CTAs, mobile-first layout.

The canvas is a warm cream (`#f9f8f4`), not pure white. Cream softens the interface and lets the yellow / green / blue accent trio feel playful without looking neon against stark surfaces. Every interactive surface rounds toward a friendly feel. The brand runs on a single high-contrast black (`#141416`), a small pastel accent trio, and Clash Display at billboard sizes.

The tone is confident-casual: accessible enough that a first-time participant trusts the flow, authoritative enough that a host believes the outcome is provably fair. Copy is direct ("Raffles! Done right!", "Your $1 could win!") — never hype, never crypto jargon.

## Colors

### Primary token split

`--primary` (#00b8ff) is the interactive accent for links, focus rings, and selection states. It is NOT the button color. CTA buttons use `rafli-black` (#141416) directly. This separation is critical for shadcn components that reference `bg-primary`.

### Core brand

- **Rafli Black (`#141416`)** — Primary CTAs, logo, headings, button fills. A cooler, more intentional black than the stone-family `foreground` token.
- **Cream (`#f9f8f4`)** — The default page canvas. Replaces pure white everywhere except card surfaces.
- **White (`#ffffff`)** — Reserved for card surfaces and text on black CTAs.

### Accent trio (always used as a set)

`rafli-blue` `#c4edff` · `rafli-green` `#beffdb` · `rafli-yellow` `#f6ff8b`

These three pastels appear together in decorative shapes, featured card backgrounds, and marketing surfaces. Use them as a trio. Individual use is reserved for specific components (countdown timer = yellow, mobile nav = green, trust section = blue).

### Color families

**Yellow family:**

- `rafli-yellow` #f6ff8b — countdown timers, marquee, landing accents. Max one per screen.
- `yellow-light` #faffc4 — host role pill bg.
- `yellow-warm` #f9ffb5 — prize highlights.
- `yellow-pale` #fffbeb — urgent state backgrounds (amber-50).

**Green / Mint family:**

- `green-live` #13e36f — "New this week" badge, live dot.
- `green-bright` #86ffae — bright green accent.
- `rafli-green` #beffdb — participant pill, mobile nav, featured card.
- `green-600` #44b476 — participant pill text.
- `green-light` #dfffed — verified host bg.

**Blue / Sky family:**

- `primary` #00b8ff — interactive accent (links, focus, selection).
- `cyan` #84dcff — legacy extended accent.
- `rafli-blue` #c4edff — landing backgrounds, decorative shapes.
- `blue-light` #e1f8ff — featured card bg (lighter sky tint).

**Neutral ramp:**
`ink` #182135 · `gray-500` #7b7b7b · `gray-400` #b4b4b4 · `gray-200` #e5e5e5 · `gray-150` #e6e8ec · `gray-100` #f1f3f5 · `gray-75` #eeeeee · `gray-50` #f4f4f4.

### Shadcn semantic tokens

`primary` `primary-foreground` `secondary` `secondary-foreground` `muted` `muted-foreground` `accent` `accent-foreground` `card` `popover` `destructive` `border` `input` `ring`.

### Status pill palette

- **Live** `#22c55e` — accepting tickets
- **Scheduled** `#3b82f6` — opens later
- **Ended** `#9ca3af` — sales closed, draw pending
- **Completed** `#a855f7` — winner drawn
- **Auto-cancelled** `#f97316` — system-cancelled
- **Cancelled** `#ef4444` — host-cancelled

### Dark mode

Full dark palette in `globals.css` under `.dark`: canvas inverts to near-black stone; `primary` flips to a light neutral. Brand accents (yellow/green/blue) used identically — designed to read on both canvases.

## Typography

Three families, each with a fixed role:

- **Clash Display** (Indian Type Foundry, loaded locally as `ClashDisplay-Variable.ttf`, weights 100–900) — Display & headlines only. Hero headlines, section titles, modal titles, price displays, tab labels, countdown digits. **Never below 18px.**
- **Geist Sans** (Vercel `geist` package, variable) — Body text, UI labels, buttons, forms, navigation. Default.
- **Geist Mono** (Vercel) — Wallet addresses, transaction hashes, technical data only.

### Scale

All Clash Display headlines scale fluidly with `clamp()` so marketing surfaces adapt from mobile to ultra-wide without media-query forks.

- **Hero** — `clamp(56px, 10vw, 120px)`, Clash Display 600, `leading-none`. Landing page H1 only. Mobile floor 56px, desktop cap 120px.
- **Section display** — `clamp(32px, 5vw, 72px)`, 600, `0.8px` tracking. Landing section headers (Trust / Participant / Host openers).
- **Browse hero** — `clamp(36px, 5vw, 52px)`, 600, `leading-none`. Browse + My Raffles page heroes. Cap is 52px.
- **Page title** — `30–36px`, 600. Raffle detail title (32px), modal titles (30px), My Raffles H1 (36px).
- **Card-title heading** — `24px`, 600, `0.12px` tracking. Featured card titles, tab labels, card accordion headers.
- **Card title (raffle card)** — `15px`, 600, `leading-1.2`. The raffle name inside a browse-grid card.
- **Card price** — Clash Display `19px / 600 / #182135`, `0.1px` tracking. The headline dollar figure on raffle cards.
- **Body large** — `18px / leading-8`, 500. Footer, emphasized hero sub-copy, bullet lists inside section cards.
- **Body** — `15px / leading-7`, 400. Default body.
- **Body small** — `14px / leading-6`, 400. Labels, metadata, tab labels.
- **Caption** — `13px`, 500. Host names, small labels, progress percentages.
- **Micro-label** — `11–12px`, 600. Role tags, verified badge, time-left readouts.

### Conventions

- **Base font size:** `16px` on mobile (prevents iOS auto-zoom on focus), `15px` at ≥640px.
- **Antialiasing:** `antialiased` applied globally.
- **Headlines:** `leading-none` for all Clash Display at display sizes.
- **Body:** `leading-7` for paragraph text.
- **Never set Clash Display below 18px** — it loses character and Geist reads better.

## Layout & Spacing

4px base unit with a clean doubling scale (`4, 8, 16, 24, 32, 48, 64, 80`). Content max-width is **`1200px`** for both the landing chrome and the app chrome.

### Container widths

- **Landing hero / section containers** — `max-width: 1200px`, horizontal padding `48px` desktop / `24px` mobile.
- **App surfaces** (browse, my-raffles, raffle detail) — `max-width: 1200px`, horizontal padding `32px` desktop / `24px` mobile.

### Section rhythm

- **Section vertical padding** — `80px` (`py-20`) both breakpoints.
- **Inter-section gap** (landing) — `60px` between hero + trust + participant + host + CTA blocks.
- **Card padding** — `14px` (raffle card) · `16px` (default) · `24px` (content / subscription cards).
- **Card gap** (grid) — `16px` siblings, `14px` stats grids, `32px` detail sidebar split.

### Navbar metrics

- **App navbar** — height `56px`, padding `0 24px`, sticky `z-20`. No bottom border.
- **Landing navbar** — height `64px`, padding `0 48px`, sticky `z-20`. No bottom border.

### Component heights (quick reference)

- **CTA button (landing)** — `60px`, **rounded `10px`**, 1px border, padding `0 28–36px`, `font-size 18`.
- **Primary button (default)** — `36px` (`h-9`), pill `rounded-full`, padding `0 16px`, `font-size 14`.
- **Primary button (sm)** — `32px` (`h-8`), padding `0 12px`, `font-size 13`.
- **Primary button (lg)** — `40px` (`h-10`), padding `0 24px`, `font-size 14`.
- **Raffle-card CTA** — `44px` (`h-11`), 1px border, outline variant, `font-size 13 / weight 600`.
- **Detail-page "Buy tickets" CTA** — `56px` (`h-14`), `rounded-full`, `font-size 16 / weight 600`.
- **Input field** — `36px` (`h-9`), `rounded-md`.
- **Search bar** — `40px` (`h-10`), `rounded-full`, padding `0 16px`.
- **Selection card** (payment method / chain selector) — `56px` (`h-14`), `rounded-lg`.
- **Counter button** (`+` / `−` inside ticket stepper) — `48px × 48px`, transparent bg, 1px divider.

### Breakpoints

Tailwind defaults: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Mobile-first; container widths collapse below `640`, navbar padding drops to `24px`, grid cards reflow to `repeat(auto-fill, minmax(240px, 1fr))`.

## Elevation & Depth

**Flat-first.** Depth is communicated through:

1. **Borders over shadows.** Cards use a transparent 1px border that reveals as solid black on hover (`border border-transparent hover:border-black`). All borders are 1px. No 2px borders anywhere.
2. **Restrained shadow ramp.** Four tokens only: `shadow-xs` (outlines), `shadow-sm` (inputs), `shadow-md` (dropdowns / popovers), `shadow-lg` (dialogs). Used exclusively for overlays.
3. **Color layering** on the landing page. Large rotated pastel blocks sit behind content to imply depth without blur.
4. **Focus rings.** 3px ring at `ring/50` on `:focus-visible` — depth for keyboard users.

No glassmorphism. No backdrop blur. No heavy drop shadows in the product UI.

### Z-index ladder

sticky navbar `z-20` · sticky filter `z-10` · dropdown / popover `z-50` · dialog `z-50` · toast `z-[60]`.

## Shapes

### Radius tokens

Four radius tokens. Everything rounds.

| Token          | Value          | Used for                                      |
| -------------- | -------------- | --------------------------------------------- |
| `rounded-md`   | 8px (0.5rem)   | Inputs, dropdown items, overlays              |
| `rounded-lg`   | 12px (0.75rem) | Dialogs, popovers, tooltips, small cards      |
| `rounded-xl`   | 20px (1.25rem) | Raffle cards, featured cards, countdown timer |
| `rounded-full` | pill (9999px)  | Buttons, badges, pills, progress bar          |

Landing-page marketing blocks use a one-off `rounded-[120px]` override. Marketing gesture for landing only; never inside app chrome.

### Per-surface overrides

- **Landing CTA button** — `10px` with 1px border. Not pill-rounded. The signature landing-page button.
- **Role pills** — `8px` (not pill). Sits absolutely positioned top-right of the raffle-card cover image.
- **Verified-host badge** — `6px` (not pill). `1px solid rafli-black`, padding `2px 6px`.

### Decorative shapes

The brand's visual identity includes clusters of **rotated rounded squares** in the three brand accent colors. These shapes appear as background decoration on landing pages, the browse hero area, and marketing sections.

**Shape spec:**

- Three rounded squares per cluster, one in each brand color: `rafli-yellow` (#f6ff8b), `rafli-green` (#beffdb), `rafli-blue` (#c4edff).
- Corner radius: 24px on all squares.
- Each square is rotated at a different angle. The three shapes overlap, creating a layered, stacked composition.
- No borders, no shadows, no blur, no opacity. Flat solid color fills only.

**Layering order (back to front):**

1. `rafli-yellow` square (largest or equal, rotated ~150°)
2. `rafli-green` square (middle, rotated ~95–155°)
3. `rafli-blue` square (top layer, rotated ~105–165°)

**Two cluster sizes:**

- **Large cluster** — squares range 365–498px. Used in hero backgrounds, section backdrops.
- **Small cluster** — squares range 187–211px. Secondary accents.

**Positioning:** Shapes sit behind content (z-index below text and cards). Clusters appear at opposite corners or offset diagonal positions. Shapes extend beyond container bounds, clipped by the parent section. Generous whitespace between clusters.

**Where they appear:** Browse page hero, landing page sections, marketing surfaces.
**Where they never appear:** Inside app chrome, inside cards, on dark mode backgrounds without explicit adaptation.

## Icons

All UI icons from [Lucide](https://lucide.dev/) via `lucide-react`. Spec: 2px stroke, round caps, round joins. Default size 20px. Color inherits from parent (`currentColor`).

`@web3icons/react` for wallet/chain marks. Custom brand SVGs (logo, ticket, EarnM coin, animated background cubes) in `src/assets/`. Rafli wordmark pairs a geometric black X mark with the RAFLI letterform nameplate (112x22 SVG).

## Components

### Buttons

Base: `inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all rounded-full focus-visible:ring-ring/50 focus-visible:ring-[3px]`.

| Variant               | Fill                  | Text         | Height | Use                                                    |
| --------------------- | --------------------- | ------------ | ------ | ------------------------------------------------------ |
| **Primary (default)** | `rafli-black` #141416 | #ffffff      | 36px   | Default CTA in app chrome. Flips white/dark on hover.  |
| **Primary (lg)**      | `rafli-black`         | #ffffff      | 40px   | Larger CTA variant.                                    |
| **Primary (sm)**      | `rafli-black`         | #ffffff      | 32px   | Compact variant.                                       |
| **CTA (landing)**     | `rafli-black`         | #ffffff      | 60px   | Landing page only. Rounded 10px, 1px border. Not pill. |
| **Outline**           | #ffffff               | `foreground` | 36px   | 1px border. Secondary actions. White fill always.      |
| **Ghost**             | transparent           | `foreground` | 36px   | Text-only hover tint. Dense toolbars.                  |
| **Destructive**       | `destructive` #dc2626 | #ffffff      | 36px   | Deletes only.                                          |
| **Icon**              | transparent           | —            | 36x36  | Square pill, icon only, no label.                      |

Outline button background is always white (#ffffff), never the page canvas color.

### Badges

| Badge                | Background                   | Text                | Radius    | Notes                                                                                   |
| -------------------- | ---------------------------- | ------------------- | --------- | --------------------------------------------------------------------------------------- |
| **Default**          | `rafli-black`                | #ffffff             | pill      | Notification counters, emphasis pills.                                                  |
| **Secondary**        | `secondary`                  | `secondary-fg`      | pill      | Low emphasis.                                                                           |
| **Outline**          | transparent                  | `foreground`        | pill      | Border only.                                                                            |
| **Best value**       | `primary` #00b8ff            | #121211             | lg (12px) | Dark text for contrast.                                                                 |
| **New this week**    | `green-live` #13e36f         | #121211             | lg (12px) |                                                                                         |
| **Host pill**        | `yellow-light` #faffc4       | `gold` #998b53      | 8px       | Not pill.                                                                               |
| **Participant pill** | `rafli-green` #beffdb        | `green-600` #44b476 | 8px       | Not pill.                                                                               |
| **Verified host**    | transparent                  | `#121211`           | 10px      | 1px solid black border, CheckCircle icon (size-3.5), `text-xs`, `px-1 py-0.5`, `gap-1`. |
| **Status pills**     | tinted bg per status         | saturated text      | pill      | Six states. Dot icon + label.                                                           |
| **Comment sort**     | black (active) / transparent | white / muted       | pill      | Segmented toggle.                                                                       |

#### Verified host badge — implementation

```tsx
import { CheckCircle } from 'lucide-react';

<span className="inline-flex items-center gap-1 rounded-[10px] border border-black px-1 py-0.5 text-xs text-[#121211]">
	<CheckCircle aria-hidden="true" className="size-3.5" />
	Verified host
</span>;
```

---

### Card Components

Six reusable card components. Each shares the same base surface (white bg, `rounded-xl` 20px, 1px border) but differs in content structure and state.

#### 1. Most Recent Winners Card (`card-winner`)

Horizontal layout. Appears in a scrollable carousel on the browse page under "Most recent winners!" heading.

| Property      | Value                                           |
| ------------- | ----------------------------------------------- |
| Background    | `card` #ffffff                                  |
| Border        | 1px solid `border` #e7e5e4                      |
| Border radius | `rounded-xl` (20px)                             |
| Padding       | 20px                                            |
| Height        | ~85px                                           |
| Gap           | 15px (flex row)                                 |
| Layout        | `display: flex; align-items: center; gap: 15px` |

**Content structure (left to right):**

1. **Prize icon circle** — 45px round (`rounded-full`), `rafli-yellow` (#f6ff8b) background. Contains a Lucide `PartyPopper` icon (24px, 2px stroke, `foreground` color). No image. The yellow circle + confetti icon is the default state for all winner cards.
2. **Text block** — stacked vertically:
   - Line 1: raffle name + truncated context (caption 13px/500, `muted-foreground`). Single line, overflow ellipsis. Example: "For The Kabuto PSA 10 1st Edition 🔥 th..."
   - Line 2: winner username (body-sm 14px/600, `foreground`). Example: "coolscorecard702"
3. **Arrow icon** — Lucide `ArrowUpRight` (24px, 2px stroke, `muted-foreground`). Right-aligned. Links to the raffle detail page.

**Carousel container:** Horizontal scroll with prev/next arrow buttons (Lucide `ChevronLeft` / `ChevronRight`, 24px). Cards are spaced `16px` apart. Three visible cards at desktop.

**Usage:** Browse page only. Section heading: "Most recent winners!" (headline-lg, Clash Display).

---

#### 2. Featured Card (`card-featured`)

Large promotional card with colored background. Two-up grid at lg breakpoint.

| Property      | Value                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| Background    | `blue-light` #e1f8ff (left card) or `rafli-green` #beffdb (right card) |
| Border        | 1px transparent, hover to 1px `rafli-black`                            |
| Border radius | `rounded-xl` (20px)                                                    |
| Padding       | 24px                                                                   |
| Height        | ~280px                                                                 |
| Layout        | `display: flex` — text block (left ~60%) + cover image (right ~40%)    |

**Content structure:**

1. **Category badge** — top-left. Either `badge-best-value` (primary cyan bg, dark text, `rounded-lg`) or `badge-new-this-week` (green-live bg, dark text, `rounded-lg`).
2. **Title** — headline-sm (24px Clash Display/600, `foreground`). 1-2 lines.
3. **Host row** — "by [name]" (caption 13px, `muted-foreground`) + `verified-host-badge` (inline, 10px radius, 1px black border, CheckCircle icon).
4. **Meta line** — "[N] participants · $[X]/ticket · [N] days left" (caption 13px, `muted-foreground`). Interpunct separators.
5. **Primary CTA** — "Enter now!" button (`button-primary`, `rafli-black` bg, white text, h-36px, `rounded-full`, full width of text column).
6. **Cover image** — right side, fills ~40% width, aspect-ratio auto, `rounded-xl` corners. Object-cover.

**Usage:** Browse page hero section. Always exactly two cards side by side at lg. Stacks to single column on mobile.

---

#### 3. Active Raffle Card (`card-raffle`)

Standard card in the browse grid. The most reused card component across the app.

| Property      | Value                                        |
| ------------- | -------------------------------------------- |
| Background    | `card` #ffffff                               |
| Border        | 1px transparent → 1px `rafli-black` on hover |
| Border radius | `rounded-xl` (20px)                          |
| Padding       | 0 (image bleeds to edges), 14px body area    |
| Width         | fluid (grid-driven), `min 240px`             |
| Layout        | Vertical stack                               |

**Content structure (top to bottom):**

1. **Cover image** — full card width, aspect-ratio 16/9, `object-cover`, top corners rounded (`rounded-xl` top). Decorative shapes (yellow/mint/blue cubes) appear behind the image on some cards.
2. **Body area** (14px padding, 12px internal gap):
   - **Title** — `card-title` (15px Geist Sans/600, `foreground`). 1-2 lines max.
   - **Host row** — flex row: "by [name]" (caption 13px, `foreground`) + `verified-host-badge` (right-aligned).
   - **Price + time row** — flex row: price "$1" (`card-price` 19px Clash Display/600, `ink` #182135, left) + Lucide `Clock` icon (14px, `muted-foreground`) + "[N] days left" (caption 13px, `muted-foreground`, right-aligned).
3. **CTA button** — "Details" (`button-outline`, h-44px, `rounded-full`, white bg, 1px border `rafli-black`, full width). Font: 13px/600.

**Icons used:** `Clock` (time remaining), `ArrowUpRight` (external link on hover).

**Usage:** Browse page "See what's up for grabs right now!" section. Grid: `repeat(auto-fill, minmax(240px, 1fr))`.

---

#### 4. Past Draw Card (`card-past-draw`)

Completed raffle card. Appears in the "Past Draws" horizontal carousel.

| Property      | Value                         |
| ------------- | ----------------------------- |
| Background    | `card` #ffffff                |
| Border        | none (no hover border)        |
| Border radius | `rounded-xl` (20px)           |
| Padding       | 16px (body), 0 (image bleeds) |
| Layout        | Vertical stack                |

**Content structure (top to bottom):**

1. **Cover image with verification overlay:**
   - Image: full width, aspect-ratio 16/9, `object-cover`, top corners rounded.
   - **Overlay badge** — positioned top-left inside the image area. `rafli-green` (#beffdb) background, h-38px, padding 11px 15px, flex row with 7.5px gap. Contains: Lucide `CircleCheck` icon (16px, `foreground` stroke) + "Selected on-chain · verified" text (caption 11px/500, `foreground`). This badge confirms the on-chain draw result.
2. **Title** — `card-title` (15px Geist Sans/600, `foreground`). Single line, truncated with ellipsis.
3. **Host row** — "by [name]" (caption 13px) + `verified-host-badge`.
4. **Price + date row** — "$1" (`card-price` 19px Clash Display/600) + "Ended [date]" (caption 13px, `muted-foreground`, right-aligned).

**Key differences from active card:** No "Details" button. No hover border. Shows "Ended [date]" instead of time remaining. The verification overlay badge on the image is the defining visual element.

**Carousel:** Horizontal scroll, prev/next arrows (`ChevronLeft`/`ChevronRight`), pagination dots below. Four visible cards at desktop.

**Usage:** Browse page "Past Draws" section. Heading: "Past Draws" (headline-lg, Clash Display) + "See who won — results verified on-chain." subtext (body-sm, `muted-foreground`).

---

#### 5. My Participated Raffle Card (`card-my-participated`)

Cards on the "My Sweepstakes" page showing raffles the user has entered.

| Property      | Value                      |
| ------------- | -------------------------- |
| Background    | `card` #ffffff             |
| Border        | 1px solid `border` #e7e5e4 |
| Border radius | `rounded-xl` (20px)        |
| Padding       | 16px                       |
| Layout        | Vertical stack             |

Extends active raffle card structure with:

- **Role pill** — `role-pill-participant` (`rafli-green` bg, `green-600` text, 8px radius, 2px 10px padding). Position: absolute top-right of cover image.
- **Status pill** — one of six status states. `rounded-full`, dot icon + label.
- **Entry count** — "You entered [N] times" or "My entries: [N]" (body-sm, `foreground`).

**States (status-driven):**

| State                | Status pill             | Additional info                       |
| -------------------- | ----------------------- | ------------------------------------- |
| **Active**           | Live (green)            | Time remaining, entry count           |
| **Ended**            | Ended (gray)            | "Draw pending", entry count           |
| **Completed (won)**  | Completed (purple)      | "You won!" highlight, prize claim CTA |
| **Completed (lost)** | Completed (purple)      | "Better luck next time"               |
| **Cancelled**        | Cancelled (red)         | "Refund processed" or refund status   |
| **Auto-cancelled**   | Auto-cancelled (orange) | "Minimum not met. Refund processed."  |

**Usage:** "My Sweepstakes" page, Participant tab.

---

#### 6. My Hosted Raffle Card (`card-my-hosted`)

Cards on the "My Sweepstakes" page in Host mode.

| Property      | Value                      |
| ------------- | -------------------------- |
| Background    | `card` #ffffff             |
| Border        | 1px solid `border` #e7e5e4 |
| Border radius | `rounded-xl` (20px)        |
| Padding       | 16px                       |
| Layout        | Vertical stack             |

Extends active raffle card structure with:

- **Role pill** — `role-pill-host` (`yellow-light` bg, `gold` text, 8px radius, 2px 10px padding). Position: absolute top-right of cover image.
- **Participant count** / progress toward minimum.
- **Revenue summary** — ticket sales total.
- **Management actions** — edit (Lucide `Pencil`), cancel (Lucide `X`).

**States (status-driven):**

| State              | Status pill             | Additional info                                 |
| ------------------ | ----------------------- | ----------------------------------------------- |
| **Active**         | Live (green)            | Participant count, time remaining, entries sold |
| **Scheduled**      | Scheduled (blue)        | Start date, edit available                      |
| **Ended**          | Ended (gray)            | "Draw pending", total entries                   |
| **Completed**      | Completed (purple)      | Winner info, total revenue                      |
| **Cancelled**      | Cancelled (red)         | Refund status                                   |
| **Auto-cancelled** | Auto-cancelled (orange) | "Minimum not met"                               |

**Usage:** "My Sweepstakes" page, Host tab.

---

### Card Summary

| Component       | Code name              | Surface               | Where used            | Unique elements                                                  |
| --------------- | ---------------------- | --------------------- | --------------------- | ---------------------------------------------------------------- |
| Winners card    | `card-winner`          | White, 1px border     | Browse carousel       | Horizontal, yellow icon circle, PartyPopper, ArrowUpRight        |
| Featured card   | `card-featured`        | Blue-light or mint bg | Browse hero           | Colored bg, category badge, CTA, cover image right               |
| Active raffle   | `card-raffle`          | White, hover border   | Browse grid           | Cover image, price, Clock icon, time left, "Details" outline btn |
| Past draw       | `card-past-draw`       | White                 | Browse carousel       | CircleCheck overlay badge, "Selected on-chain", end date         |
| My participated | `card-my-participated` | White, 1px border     | My Sweepstakes        | 6 status states, entry count, participant pill                   |
| My hosted       | `card-my-hosted`       | White, 1px border     | My Sweepstakes (Host) | 6 status states, management actions, revenue, host pill          |

All cards use `rounded-xl` (20px). All borders are 1px. Status pills from the six-color taxonomy drive the visual state of My Sweepstakes cards.

---

### Marquee Stripe (`MarqueeBanner`)

A full-width horizontal auto-scrolling banner positioned directly below the navbar. Carries promotional or engagement copy.

**Component implementation (Next.js / Tailwind):**

```tsx
'use client';

interface MarqueeBannerProps {
	readonly message: string;
}

export function MarqueeBanner({ message }: MarqueeBannerProps) {
	return (
		<div className="border-y-rafli-black sticky top-14 z-[19] overflow-hidden border-y bg-[#f6ff8b] sm:top-16">
			<div className="animate-marquee flex w-max items-center gap-2 py-3">
				{Array.from({ length: 8 }).map((_, i) => (
					<span key={i} className="flex items-center gap-2">
						<span className="text-lg font-semibold">{message}</span>
						<span className="bg-foreground inline-block size-2 rounded-full" />
					</span>
				))}
			</div>
		</div>
	);
}
```

**CSS animation in `globals.css`:**

```css
@keyframes marquee {
	0% {
		transform: translateX(0);
	}
	100% {
		transform: translateX(-50%);
	}
}

.animate-marquee {
	animation: marquee 20s linear infinite;
}
```

**Spec summary:**

| Property       | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Background     | `bg-[#f6ff8b]` (rafli-yellow)                                     |
| Position       | sticky, top-14 (mobile) / top-16 (sm+), z-[19]                    |
| Border         | border-y, 1px solid rafli-black on top and bottom                 |
| Inner layout   | flex items-center, gap-2, py-3                                    |
| Item count     | 8 spans (Array.from length 8)                                     |
| Item structure | message text + 8px dot per span                                   |
| Message font   | text-lg (18px), font-semibold (600), Geist Sans, foreground color |
| Dot            | inline-block, size-2 (8px), rounded-full, bg-foreground           |
| Animation      | animate-marquee, 20s linear infinite                              |
| Keyframes      | translateX(0) → translateX(-50%)                                  |
| Overflow       | hidden                                                            |

**Where it appears:** Below navbar on browse page, raffle detail pages, all authenticated surfaces. Context-aware copy changes per page (browse: "Share any sweepstakes", detail: "Share this sweepstakes").

---

### Carousels

Three carousel implementations for different surfaces. Each has distinct nav button specs and use cases.

#### 1. Base Carousel — `src/components/ui/carousel.tsx`

Built on `embla-carousel-react`. The shadcn primitive used wherever multiple cards scroll horizontally.

**Composable parts:** `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`.

**Nav button specs (`CarouselPrevious` / `CarouselNext`):**

| Property       | Value                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| Size           | `size-8` (32×32px), `rounded-full`                                                   |
| Variant        | `outline` (shadcn Button outline)                                                    |
| Position       | `absolute`, horizontal `-left-12` / `-right-12`, vertical `top-1/2 -translate-y-1/2` |
| Icons          | `ArrowLeft` / `ArrowRight` from lucide-react                                         |
| Disabled state | Auto-disables when `!canScrollPrev` / `!canScrollNext`                               |

**Used in:** Most Recent Winners carousel, Past Draws carousel, any horizontal card list.

#### 2. Image Carousel — `src/components/ui/image-carousel.tsx`

framer-motion image-only carousel. Used for simpler image galleries. **Infinite loop** (wraps around at the ends).

**Nav button specs:**

| Property   | Value                                                             |
| ---------- | ----------------------------------------------------------------- |
| Position   | `absolute top-1/2 left-3` / `right-3`, `z-10`, `-translate-y-1/2` |
| Shape      | `rounded-full`, `p-2`                                             |
| Background | `bg-black/50` → hover `bg-black/70`                               |
| Icon color | `text-white/90` → hover `hover:text-background`                   |
| Icons      | `ChevronLeft` / `ChevronRight`, `h-5 w-5`                         |
| Transition | `transition-colors`                                               |

**Dot indicators:**

- Size: `h-1.5 w-1.5 rounded-full`
- Active: `bg-background`
- Inactive: `bg-background/50`
- Layout: `gap-1.5`, centered at `bottom-3`

**Slide animation:** framer-motion spring (`stiffness: 200, damping: 20`), slides in from `±100%` x with opacity fade.

**Used in:** Simple image galleries.

#### 3. Raffle Media Carousel — `src/components/raffle/raffle-media-carousel.tsx`

The most complete carousel. Handles **mixed media** (images + videos), reduced-motion preferences, error states, and a numeric badge fallback when `> 8 items`.

**Nav button specs:**

| Property   | Value                                                                   |
| ---------- | ----------------------------------------------------------------------- |
| Position   | `absolute top-1/2 left-3` / `right-3`, `z-10`, `-translate-y-1/2`       |
| Shape      | `size-11` (44×44px), `rounded-full`, `flex items-center justify-center` |
| Background | `bg-black/50` → hover `bg-black/70`                                     |
| Icon color | `text-white/90`                                                         |
| Icons      | `ChevronLeft` / `ChevronRight`, `size-6`                                |
| Transition | `transition-colors`                                                     |

**Dot indicators (≤ 8 items):**

- `size-1.5 rounded-full transition-colors`
- Active: `bg-background`
- Inactive: `bg-background/50`

**Numeric badge (> 8 items):**

- Position: `absolute right-3 bottom-3`
- Style: `rounded-full bg-black/50 px-2.5 py-1`
- Text: `text-xs font-medium text-white/90`
- Accessibility: `aria-live="polite"`

**Frame:** `aspect-video max-h-96 w-full overflow-hidden rounded-2xl border border-[#E5E5E5] bg-gray-100`

**Used in:** Raffle detail page hero (cover images + videos for the prize).

#### Carousel selection rule

| Use case                                                              | Component             |
| --------------------------------------------------------------------- | --------------------- |
| Card carousels (winners, past draws, any card grid horizontal scroll) | Base Carousel         |
| Simple image galleries with infinite loop                             | Image Carousel        |
| Mixed media (images + videos) on raffle detail page                   | Raffle Media Carousel |

---

### Other Components

- **Countdown timer** — `rafli-yellow` bg, 1px `rafli-black` border, Clash Display 36px digits, `rounded-xl`, framer-motion `popLayout` per tick.
- **Progress bar** — track `#f3f4f6`, fill `primary` #00b8ff, height 11px, `rounded-full`.
- **Input field** — `h-9 w-full rounded-md border border-input bg-transparent px-3 py-1`. Number inputs auto-select on focus. Focus: border changes to `primary` cyan, 3px ring.
- **Dialog / Popover / Dropdown** — Shadcn primitives. Dialogs `shadow-lg`, white bg. Popovers/dropdowns `shadow-md`. All `rounded-lg` (12px).
- **Search bar** — `h-10`, `rounded-full`, white bg, padding `0 16px`.
- **Selection card** — `h-14`, `rounded-lg`, white bg. Payment method / chain selector.
- **Mobile navigation** — full-viewport `rafli-green` overlay with Clash Display links at display-section-mobile size.
- **Navbar** — sticky `z-20`, cream bg, padding `0 24px` (app) / `0 48px` (landing). No bottom border. Logo (112x22 SVG) + nav links + user-mode toggle + icon buttons (Lucide 20px).

## Rules

- `rafli-yellow` for countdown timers and landing accents only. Max one yellow element per screen.
- Clash Display never below 18px.
- CTAs use `rafli-black`. Cyan `primary` is for links, progress, selection.
- `rounded-[120px]` is landing-only. Never inside app chrome.
- All borders 1px. No exceptions.
- Semantic tokens in component code. Raw hex only for brand accents in marketing contexts.
- One button emphasis tier per action group. No mixing solid and outlined.
- Black/white flip on primary buttons. Core Rafli interaction.
- Six status colors are the full vocabulary. No new states without updating the taxonomy.
- Page background is always `#f9f8f4`. White (#ffffff) is for card surfaces only.
- Outline button fill is white (#ffffff), not canvas.
- WCAG AA required. Pair `rafli-yellow` with near-black text.
- All brand and status colors must exist as CSS custom properties.
- Motion is decorative. Use animation for personality, state changes, countdown ticks, hero reveals, card hover transitions.
- Use the accent trio (`rafli-blue` + `rafli-green` + `rafli-yellow`) together as a set in decorative surfaces.
- Keep copy direct and grounded. No crypto jargon in participant-facing surfaces.
