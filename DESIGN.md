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
  # ── Atoms ──
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
  # ── Molecules: Buttons ──
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
    { rounded: '{rounded.full}', height: 40px, padding: 0 24px }
  button-primary-sm:
    { rounded: '{rounded.full}', height: 32px, padding: 0 12px }
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
  # ── Molecules: Badges ──
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
  status-pill:
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
  # ── Molecules: Cards ──
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
  marquee-banner:
    {
      backgroundColor: '#f6ff8b',
      borderWidth: 1px,
      borderColor: '{colors.rafli-black}',
      borderStyle: 'solid top + solid bottom',
      padding: '12px 0',
      gap: 8px,
      itemCount: 8,
      messageFont: 'Geist Sans 18px / 600',
      messageColor: '{colors.foreground}',
      dotSize: 8px,
      dotColor: '{colors.foreground}',
      animation: 'marquee 20s linear infinite',
    }
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
  carousel-base:
    {
      navButtonSize: 32px,
      navButtonRounded: '{rounded.full}',
      navButtonVariant: outline,
      navButtonPosition: 'absolute -left-12 / -right-12, top-1/2',
      icons: 'ArrowLeft / ArrowRight',
    }
  carousel-image:
    {
      navButtonPosition: 'absolute left-3 / right-3, top-1/2',
      navButtonShape: 'rounded-full p-2',
      navButtonBg: 'bg-black/50 hover:bg-black/70',
      navButtonIconColor: 'text-white/90',
      icons: 'ChevronLeft / ChevronRight (h-5 w-5)',
      dotSize: 6px,
      dotActiveColor: '{colors.background}',
      animation: 'framer-motion spring (200/20)',
    }
  carousel-raffle-media:
    {
      navButtonSize: 44px,
      navButtonShape: 'rounded-full',
      navButtonBg: 'bg-black/50 hover:bg-black/70',
      navButtonIconColor: 'text-white/90',
      icons: 'ChevronLeft / ChevronRight (size-6)',
      frameAspect: 'aspect-video max-h-96',
      frameRounded: '1rem (rounded-2xl)',
      frameBorder: '1px solid #E5E5E5',
      frameBg: '{colors.gray-100}',
      numericBadgeThreshold: 8,
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

### Core brand

- **Rafli Black (`#141416`)** — Primary CTAs, logo, headings, button fills. A cooler, more intentional black than the stone-family `foreground` token.
- **Cream (`#f9f8f4`)** — The default page canvas. Replaces pure white everywhere except card surfaces.
- **White (`#ffffff`)** — Reserved for card surfaces and text on black CTAs.
- **Primary (`#00b8ff`)** — Interactive accent for links, focus rings, selection states. NOT the button color.

### Accent trio (always used as a set)

`rafli-blue` `#c4edff` · `rafli-green` `#beffdb` · `rafli-yellow` `#f6ff8b`

These three pastels appear together in decorative shapes, featured card backgrounds, and marketing surfaces. Use them as a trio. Individual use is reserved for specific components (countdown timer = yellow, mobile nav = green, trust section = blue).

### Semantic (shadcn) tokens

`primary` · `primary-foreground` · `secondary` · `secondary-foreground` · `muted` · `muted-foreground` · `accent` · `accent-foreground` · `card` · `popover` · `destructive` · `border` · `input` · `ring`.

### Neutral ramp

`ink` #182135 · `gray-500` #7b7b7b · `gray-400` #b4b4b4 · `gray-200` #e5e5e5 · `gray-150` #e6e8ec · `gray-100` #f1f3f5 · `gray-75` #eeeeee · `gray-50` #f4f4f4.

### Extended accents

`green-light` #dfffed · `green-600` #44b476 · `green-live` #13e36f · `green-bright` #86ffae · `gold` #998b53 · `yellow-light` #faffc4 · `yellow-warm` #f9ffb5 · `yellow-pale` #fffbeb · `cyan` #84dcff · `blue-light` #e1f8ff · `red` #e5484d.

### Status-pill palette

`status-live` #22c55e · `status-scheduled` #3b82f6 · `status-ended` #9ca3af · `status-completed` #a855f7 · `status-auto-cancelled` #f97316 · `status-cancelled` #ef4444.

### Dark mode

Full dark palette in `globals.css` under `.dark`: canvas inverts to near-black stone; `primary` flips to a light neutral. Brand accents (yellow/green/blue) used identically — designed to read on both canvases.

## Typography

Three families, each with a fixed role:

- **Clash Display** (Indian Type Foundry, loaded locally as `ClashDisplay-Variable.ttf`, weights 100–900) — Display & headlines only. Hero headlines, section titles, modal titles, price displays, tab labels, countdown digits. **Never below 18px.**
- **Geist Sans** (Vercel `geist` package, variable) — Body text, UI labels, buttons, forms, navigation. Default.
- **Geist Mono** (Vercel) — Wallet addresses, transaction hashes, technical data only.

### Scale

All Clash Display headlines scale fluidly with `clamp()` so marketing surfaces adapt from mobile to ultra-wide without media-query forks.

- **Hero** — `clamp(56px, 10vw, 120px)`, Clash Display 600, `leading-none`. Landing page H1 only.
- **Section display** — `clamp(32px, 5vw, 72px)`, 600, `0.8px` tracking. Landing section headers.
- **Browse hero** — `clamp(36px, 5vw, 52px)`, 600, `leading-none`. Browse + My Raffles page heroes.
- **Page title** — `30–36px`, 600. Raffle detail title (32px), modal titles (30px), My Raffles H1 (36px).
- **Card-title heading** — `24px`, 600, `0.12px` tracking. Featured card titles, tab labels, card accordion headers.
- **Card title (raffle card)** — `15px`, 600, `leading-1.2`. The raffle name inside a browse-grid card.
- **Card price** — Clash Display `19px / 600 / #182135`, `0.1px` tracking. The headline dollar figure.
- **Body large** — `18px / leading-8`, 500. Footer, emphasized hero sub-copy, bullet lists.
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

- **CTA button (landing)** — `60px`, **rounded `10px`**, 1px border, padding `0 28–36px`.
- **Primary button (default)** — `36px`, pill `rounded-full`, padding `0 16px`.
- **Primary button (sm)** — `32px`, padding `0 12px`.
- **Primary button (lg)** — `40px`, padding `0 24px`.
- **Raffle-card CTA** — `44px`, 1px border, outline variant.
- **Detail-page "Buy tickets" CTA** — `56px`, `rounded-full`.
- **Input field** — `36px` (`h-9`), `rounded-md`.
- **Search bar** — `40px`, `rounded-full`, padding `0 16px`.
- **Selection card** (payment / chain selector) — `56px`, `rounded-lg`.
- **Counter button** (`+` / `−`) — `48px × 48px`, transparent bg, 1px divider.

### Raffle-card internal metrics

- **Card width** — fluid (grid-driven), min `240px`.
- **Card padding** — `14px` body, image bleeds to edges.
- **Cover image** — full width, aspect 16/9, object-cover.
- **Title** — `card-title` (15px Geist 600), 1–2 lines.
- **Price** — `card-price` (19px Clash 600 in `ink`).
- **CTA** — `Details` outline, h-44, 1px black border, white bg, full width.

### Breakpoints

Tailwind defaults: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Mobile-first; container widths collapse below `640`, navbar padding drops to `24px`, grid cards reflow to `repeat(auto-fill, minmax(240px, 1fr))`.

## Elevation & Depth

**Flat-first.** Depth is communicated through:

1. **Borders over shadows.** Cards use a transparent 1px border that reveals as solid black on hover (`border border-transparent hover:border-black`). All borders are 1px. No 2px borders anywhere.
2. **Restrained shadow ramp.** Four tokens only: `shadow-xs` (outlines), `shadow-sm` (inputs), `shadow-md` (dropdowns / popovers), `shadow-lg` (dialogs).
3. **Color layering** on the landing page — large rotated pastel blocks behind content imply depth without blur.
4. **Focus rings.** 3px ring at `ring/50` on `:focus-visible`.

No glassmorphism. No backdrop blur. No heavy drop shadows in the product UI.

### Z-index ladder

sticky navbar `z-20` · marquee `z-[19]` · sticky filter `z-10` · dropdown / popover `z-50` · dialog `z-50` · toast `z-[60]`.

## Shapes

Four radius tokens. Everything rounds.

| Token          | Value          | Used for                                      |
| -------------- | -------------- | --------------------------------------------- |
| `rounded-md`   | 8px (0.5rem)   | Inputs, dropdown items, overlays              |
| `rounded-lg`   | 12px (0.75rem) | Dialogs, popovers, tooltips, small cards      |
| `rounded-xl`   | 20px (1.25rem) | Raffle cards, featured cards, countdown timer |
| `rounded-full` | pill (9999px)  | Buttons, badges, pills, progress bar          |

Landing-page marketing blocks use a one-off `rounded-[120px]` override. Marketing gesture for landing only; never inside app chrome.

### Per-surface radius overrides

- **Landing CTA button** — `10px` with 1px border. Not pill-rounded.
- **Role pills** — `8px` (not pill).
- **Verified-host badge** — `10px` (not pill). 1px solid black border.
- **Best-value / New-this-week badges** — `12px` (rounded-lg, not pill).

### Decorative shapes

Three-square clusters in the brand accent trio appear behind hero and marketing content.

- Three rounded squares per cluster: `rafli-yellow` (back), `rafli-green` (middle), `rafli-blue` (front).
- 24px corner radius on all squares.
- Each rotated at a different angle, overlapping.
- Strict rule: no borders, no shadows, no blur, no opacity. Flat solid fills only.
- Two cluster sizes: large (365–498px) and small (187–211px).
- Sit behind content. Extend beyond container bounds, clipped by parent.
- Browse hero, landing sections, marketing surfaces only. Never inside app chrome or cards.

## Icons

All UI icons from [Lucide](https://lucide.dev/) via `lucide-react`. Spec: 2px stroke, round caps, round joins. Default size 20px. Color inherits from parent (`currentColor`).

`@web3icons/react` for wallet/chain marks. Custom brand SVGs (logo 112x22, ticket, EarnM coin, animated cubes) in `src/assets/`.

## Components

### Atoms

- `atom-input` — bare input field, `h-9 rounded-md` border `input`. Number inputs auto-select on focus.
- `atom-status-dot` — 8px circle, `green-live` fill. Reused inside live status pills.
- `atom-focus-ring` — 3px outline, `ring/50` color. Applied via `:focus-visible`.
- `atom-progress-track` — h-11px `#f3f4f6` rail, `rounded-full`.
- `atom-progress-fill` — `primary` #00b8ff, `rounded-full`.

### Molecules

#### Buttons

| Variant           | Fill          | Text       | Height | Use                                     |
| ----------------- | ------------- | ---------- | ------ | --------------------------------------- |
| Primary (default) | `rafli-black` | white      | 36px   | App CTA. Flips white/dark on hover.     |
| Primary (sm)      | `rafli-black` | white      | 32px   | Compact.                                |
| Primary (lg)      | `rafli-black` | white      | 40px   | Larger variant.                         |
| CTA (landing)     | `rafli-black` | white      | 60px   | Landing only. Rounded 10px, 1px border. |
| Outline           | white         | foreground | 36px   | 1px black border. White bg always.      |
| Ghost             | transparent   | foreground | 36px   | Text-only hover tint.                   |
| Destructive       | `destructive` | white      | 36px   | Deletes only.                           |
| Icon              | transparent   | —          | 36×36  | Icon-only square pill.                  |

#### Badges

| Badge            | Background                 | Text           | Radius | Notes                                         |
| ---------------- | -------------------------- | -------------- | ------ | --------------------------------------------- |
| Default          | `rafli-black`              | white          | pill   | Counters, emphasis.                           |
| Secondary        | `secondary`                | secondary-fg   | pill   | Low emphasis.                                 |
| Outline          | transparent                | foreground     | pill   | Border only.                                  |
| Best value       | `primary` #00b8ff          | #121211        | 12px   | Dark text.                                    |
| New this week    | `green-live`               | #121211        | 12px   |                                               |
| Host pill        | `yellow-light`             | `gold`         | 8px    | Not pill.                                     |
| Participant pill | `rafli-green`              | `green-600`    | 8px    | Not pill.                                     |
| Verified host    | transparent                | #121211        | 10px   | 1px solid black. CheckCircle icon (size-3.5). |
| Status pills     | tinted bg per status       | saturated text | pill   | Six states. Dot icon + label.                 |
| Comment sort     | black active / transparent | white / muted  | pill   | Segmented toggle.                             |

**Verified host badge — implementation:**

```tsx
import { CheckCircle } from 'lucide-react';

<span className="inline-flex items-center gap-1 rounded-[10px] border border-black px-1 py-0.5 text-xs text-[#121211]">
	<CheckCircle aria-hidden="true" className="size-3.5" />
	Verified host
</span>;
```

#### Cards

Six reusable card components. Each shares a `rounded-xl` (20px) surface but differs in content and state.

- **`card-winner`** — Most Recent Winners. White bg, 1px border, 20px padding, 85px height. Flex row: 45px `rafli-yellow` circle (Lucide PartyPopper icon) + raffle name (caption muted) + winner username (body-sm 600) + ArrowUpRight icon (foreground). Used in browse carousel.
- **`card-featured`** — Browse hero. `blue-light` (left) or `rafli-green` (right) bg, 1px transparent → black hover, 24px padding. Two-up at lg. Category badge + headline-sm title + host row + meta + primary CTA + cover image (~40% right).
- **`card-raffle`** — Browse grid. White bg, 1px transparent → 1px `rafli-black` hover. 14px body padding, image bleeds. Cover + card-title (15px/600) + host row + verified badge + price (19px Clash) + Clock icon + time left + outline button h-44.
- **`card-past-draw`** — Past Draws carousel. White bg, `rafli-green` "Selected on-chain · verified" overlay badge on image (CircleCheck icon, 38px high, 11px 15px padding). Title truncated. End date instead of time. No CTA. No hover.
- **`card-my-participated`** — My Sweepstakes participant view. Extends raffle card. Adds entry count, status pill, participant role pill (top-right of cover). Six states: Active, Ended, Completed (won), Completed (lost), Cancelled, Auto-cancelled.
- **`card-my-hosted`** — My Sweepstakes host view. Extends raffle card. Adds host role pill, participant count, revenue, management actions (Pencil/X icons). Six states: Active, Scheduled, Ended, Completed, Cancelled, Auto-cancelled.

### Organisms

- **Countdown timer** — `rafli-yellow` bg, 1px `rafli-black` border, Clash Display 36px digits, `rounded-xl`, framer-motion `popLayout` per tick.
- **Navbar (app)** — sticky `z-20`, `cream` bg, height 56px, padding `0 24px`. Logo (112x22 SVG) + nav links + Host/Participant toggle (32px, 1px black border, black fill active) + icon buttons (Lucide 20px). No bottom border.
- **Navbar (landing)** — height 64px, padding `0 48px`. Same content rules.
- **Marquee banner** — sticky `top-14 z-[19]`, `bg-[#f6ff8b]`, `border-y border-rafli-black` (1px black top + bottom). 8 spans inside, each with message (`text-lg font-semibold`) + 8px filled dot. `gap-2 py-3`. `animate-marquee 20s linear infinite`, `translateX(0) → translateX(-50%)`.

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

- **Mobile nav overlay** — full-viewport `rafli-green` panel with Clash Display links at display-section-mobile size.
- **Search bar** — `h-10`, `rounded-full`, white bg.
- **Selection card** — `h-14`, `rounded-lg`, white bg. Payment / chain selector.
- **Footer** — `body-lg`, foreground on cream.
- **Carousels** — three implementations: `Carousel` (shadcn/Embla, 32px outline nav buttons at `-left-12`/`-right-12`), `ImageCarousel` (framer-motion infinite loop, `bg-black/50` nav buttons inside frame), `RaffleMediaCarousel` (44px nav buttons, mixed media, numeric badge fallback at >8 items).

### Motifs (brand assets referenced by organisms)

- **Decorative shape clusters** — three rounded squares (yellow/green/blue, 24px radius), no borders/shadows/blur. Two sizes (large 365–498px, small 187–211px). Behind landing and browse hero only.
- **Rafli wordmark** — geometric black X mark + RAFLI letterform, 112x22 SVG.

## Do's and Don'ts

### Colors

- **Do** use `rafli-yellow` only for countdown timers and landing accents. Max one yellow element per screen.
- **Do** default CTAs to `rafli-black`. Cyan `primary` is for links, progress, selection.
- **Do** use the accent trio (`rafli-blue` + `rafli-green` + `rafli-yellow`) together as a set in decorative surfaces.
- **Don't** use pure white (#ffffff) as page background. White is for card surfaces only.
- **Don't** mix `foreground` (#1c1917 stone) and `rafli-black` (#141416) interchangeably — `foreground` is body text, `rafli-black` is buttons and high-emphasis fills.
- **Don't** add new status states without updating the six-color taxonomy.

### Typography

- **Do** keep Clash Display at 18px and above. Below that, use Geist Sans.
- **Do** apply `card-price` (19px Clash in `ink`) for any headline dollar figure.
- **Do** use Geist Mono only for technical data (tx hashes, ticket codes).
- **Don't** use Clash Display for body text or buttons. Geist Sans is the default.
- **Don't** let buttons render in Clash Display. Button text is Geist Sans 14px/500 (default) or 13px/600 (raffle card outline).

### Shape & elevation

- **Do** round every interactive surface: buttons `rounded-full`, inputs `rounded-md`, cards `rounded-xl`.
- **Do** keep `rounded-[120px]` for landing marketing blocks only.
- **Do** use 1px borders everywhere. No exceptions.
- **Don't** use 2px borders anywhere in the system.
- **Don't** add box-shadows for visual weight. Use 1px borders + hover transitions instead.

### Components

- **Do** maintain the black/white flip on primary buttons. Core Rafli interaction.
- **Do** keep outline button fills white (#ffffff), not the canvas color.
- **Do** use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`) in component code.
- **Don't** mix solid and outlined button variants in the same action group.
- **Don't** change the marquee anatomy: 8 spans, message + dot, gap-2, py-3, border-y.
- **Don't** use the Verified host badge in a pill shape — it's `rounded-[10px]` with a black border.

### Motion & voice

- **Do** treat motion as decorative. Use animation for personality, state changes, countdown ticks, hero reveals, card hover transitions.
- **Do** keep copy direct and grounded. No crypto jargon in participant-facing surfaces.
- **Don't** rely on motion to convey critical state. Color and copy carry meaning first.
- **Don't** use hype copy ("revolutionary", "game-changing"). Confident-casual tone only.
