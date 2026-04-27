---
version: alpha
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
  cyan: '#84dcff'
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
  sm: 0.375rem
  md: 0.5rem
  lg: 0.625rem
  xl: 0.875rem
  2xl: 1.125rem
  3xl: 1.375rem
  4xl: 1.625rem
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
  # ═══════════════════════════════════════════════════════════════
  # ATOMS — single-concept primitives
  # ═══════════════════════════════════════════════════════════════
  atom-button-base:
    { typography: '{typography.label-md}', rounded: '{rounded.full}' }
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
    {
      backgroundColor: '{colors.gray-75}',
      rounded: '{rounded.full}',
      height: 11px,
    }
  atom-progress-fill:
    { backgroundColor: '{colors.cyan}', rounded: '{rounded.full}' }
  # ═══════════════════════════════════════════════════════════════
  # MOLECULES — small groupings of atoms
  # ═══════════════════════════════════════════════════════════════
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
    { backgroundColor: '{colors.rafli-black}', textColor: '{colors.white}' }
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
      borderWidth: 2px,
      borderColor: '{colors.rafli-black}',
    }
  button-cta-hover:
    { backgroundColor: '{colors.white}', textColor: '{colors.rafli-black}' }
  button-outline:
    {
      backgroundColor: transparent,
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
      textColor: '{colors.foreground}',
      typography: '{typography.label-sm}',
      rounded: 6px,
      padding: '2px 6px',
      borderWidth: 1px,
      borderColor: '{colors.rafli-black}',
    }
  progress-bar:
    { backgroundColor: '{colors.gray-75}', rounded: 6px, height: 10px }
  progress-bar-fill: { backgroundColor: '{colors.cyan}', rounded: 6px }
  form-field: { backgroundColor: transparent, textColor: '{colors.foreground}' }
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
  # ═══════════════════════════════════════════════════════════════
  # ORGANISMS — multi-molecule compositions
  # ═══════════════════════════════════════════════════════════════
  card-raffle:
    {
      backgroundColor: '{colors.card}',
      textColor: '{colors.card-foreground}',
      rounded: '16px 16px 24px 24px',
      padding: '{spacing.card-padding}',
      borderWidth: 1px,
      borderColor: transparent,
      width: 220px,
    }
  card-raffle-hover:
    {
      backgroundColor: '{colors.card}',
      textColor: '{colors.card-foreground}',
      rounded: '16px 16px 24px 24px',
      borderWidth: 1px,
      borderColor: '{colors.rafli-black}',
    }
  card-featured:
    {
      backgroundColor: '{colors.card}',
      rounded: '{rounded.3xl}',
      padding: 24px,
      borderWidth: 1px,
      borderColor: transparent,
    }
  card-section-landing:
    {
      backgroundColor: '{colors.card}',
      rounded: 80px,
      padding: '64px 56px',
      borderWidth: 2px,
      borderColor: '{colors.rafli-black}',
    }
  card-winner:
    {
      backgroundColor: '{colors.card}',
      rounded: '{rounded.2xl}',
      padding: 16px,
    }
  card-past-draw:
    {
      backgroundColor: '{colors.card}',
      rounded: '{rounded.2xl}',
      padding: 16px,
    }
  card-content:
    {
      backgroundColor: '{colors.card}',
      rounded: '{rounded.2xl}',
      padding: 24px,
    }
  card-subscription-plan:
    {
      backgroundColor: '{colors.card}',
      rounded: '{rounded.2xl}',
      padding: 24px,
    }
  countdown-timer:
    {
      backgroundColor: '{colors.rafli-yellow}',
      textColor: '{colors.foreground}',
      typography: '{typography.countdown-digit}',
      rounded: '{rounded.2xl}',
      padding: 16px,
    }
  countdown-timer-urgent:
    {
      backgroundColor: '#fffbeb',
      textColor: '#92400e',
      rounded: '{rounded.2xl}',
      padding: 16px,
    }
  navbar:
    {
      backgroundColor: '{colors.background}',
      textColor: '{colors.foreground}',
      height: 56px,
      padding: '0 24px',
      borderBottomWidth: 1px,
      borderBottomColor: '{colors.rafli-black}',
    }
  navbar-landing:
    {
      backgroundColor: '{colors.background}',
      textColor: '{colors.foreground}',
      height: 64px,
      padding: '0 48px',
      borderBottomWidth: 1px,
      borderBottomColor: '{colors.rafli-black}',
    }
  navbar-public: { backgroundColor: '{colors.background}', height: 64px }
  mobile-nav-overlay:
    {
      backgroundColor: '{colors.rafli-green}',
      textColor: '{colors.rafli-black}',
      typography: '{typography.display-section-mobile}',
    }
  hero-section:
    {
      backgroundColor: '{colors.background}',
      textColor: '{colors.rafli-black}',
      typography: '{typography.display-hero}',
    }
  footer:
    {
      backgroundColor: '{colors.background}',
      textColor: '{colors.foreground}',
      typography: '{typography.body-lg}',
    }
---

# Rafli Design System

> Tokens authored in `src/app/globals.css` (Tailwind CSS v4, CSS-first config). This document mirrors those tokens in a portable shape and organizes the `components` section using **atomic design** (atoms → molecules → organisms). Source-of-truth design bundle exported from Claude Design ([claude.ai/design](https://claude.ai/design)).

## Brand & Style

Rafli is a fair, transparent raffle platform for on-chain prize draws — a subsidiary of the EARN'M Foundation, domain [rafli.win](https://www.rafli.win), tagline **"Fair Raffles & Real Prizes."**

The identity sits at the intersection of four traits:

- **Trustworthy** — Verified draws, transparent process, blockchain-backed.
- **Playful** — Pastel accent trio, rounded shapes, animated reveals.
- **Modern** — Clean typography, generous whitespace, minimal chrome.
- **Accessible** — Simple language, clear CTAs, mobile-first layout.

The canvas is a warm cream (`#f9f8f4`), not pure white. Cream softens the interface and lets the yellow / green / blue accent trio feel playful without looking neon against stark surfaces. Every interactive surface rounds toward a friendly feel — **no sharp corners anywhere**. The brand runs on a single high-contrast black (`#141416`), a small pastel accent trio, and Clash Display at billboard sizes.

The tone is confident-casual: accessible enough that a first-time participant trusts the flow, authoritative enough that a host believes the outcome is provably fair. Copy is direct ("Raffles! Done right!", "Your $1 could win!") — never hype, never crypto jargon.

## Colors

### Core brand

The foundational palette. Use these consistently across every touchpoint.

- **Rafli Black (`#141416`)** — Primary CTAs, logo, headings, button fills. A cooler, more intentional black than the stone-family `foreground` token; never substitute pure `#000000`.
- **Cream (`#f9f8f4`)** — The default page canvas. Warm enough to make the accent trio feel at home; replaces pure white everywhere except card surfaces.
- **White (`#ffffff`)** — Reserved for card surfaces that sit on the cream canvas and for text on black CTAs.

### Accent trio (always used as a set)

The signature Rafli gesture. These three colors appear together in the landing-page "cube trio," modal success states, the 404 page, and the footer.

- **Rafli Blue (`#c4edff`)** — Decorative shapes, Trust section backgrounds.
- **Rafli Green (`#beffdb`)** — Status badges, mobile-nav overlay, highlights.
- **Rafli Yellow (`#f6ff8b`)** — Step highlights, countdown timers, prize callouts.

> **Rule.** When only a single accent is needed, prefer **Rafli Green** for positive states and **Rafli Blue** for informational contexts. Never replace the yellow with a different yellow — it is the single most recognizable color in the system.

### Semantic (shadcn) tokens

These are the names component code reaches for (`bg-primary`, `text-muted-foreground`, etc.). **`--primary` resolves to cyan `#00b8ff` and is used for links, progress fills, and selection states only.** Buttons, notification badges (unread chips, counter pills, default `Badge` fill), and any high-emphasis action surface use **`rafli-black` (`#141416`)** — never cyan.

`primary` `primary-foreground` `secondary` `secondary-foreground` `muted` `muted-foreground` `accent` `accent-foreground` `card` `popover` `destructive` `border` `input` `ring`.

### Neutral ramp

`ink` `#182135` (app headings) · `gray-500` `#7b7b7b` (secondary text) · `gray-400` `#b4b4b4` (placeholders) · `gray-200` `#e5e5e5` (input borders) · `gray-150` `#e6e8ec` (navbar dividers) · `gray-100` `#f1f3f5` (table rows) · `gray-75` `#eeeeee` (progress tracks) · `gray-50` `#f4f4f4` (badge bg).

### Extended accents

`green-light` `#dfffed` (verified host bg) · `green-600` `#44b476` (participant text) · `green-live` `#13e36f` (8px live dot) · `green-bright` `#86ffae` (global `--color-green`) · `gold` `#998b53` (host text) · `yellow-light` `#faffc4` (host bg) · `yellow-warm` `#f9ffb5` (prize highlights) · `cyan` `#84dcff` (progress fill) · `red` `#e5484d` (error icon).

### Status-pill palette

Six states, one color each, used on every raffle card:

live `#22c55e` · scheduled `#3b82f6` · ended `#9ca3af` · completed `#a855f7` · auto-cancelled `#f97316` · cancelled `#ef4444`.

### Dark mode

A full dark palette is defined under the `.dark` selector in `globals.css`. The accent trio (yellow / green / blue) is used identically — these pastels are engineered to read against both canvases.

## Typography

Three families, each with a fixed role:

- **Clash Display** (Indian Type Foundry, loaded locally as `ClashDisplay-Variable.ttf`, weights 100–900) — Display & headlines only. Hero headlines, section titles, modal titles, price displays, tab labels, countdown digits. **Never below 18px.**
- **Geist Sans** (Vercel `geist` package, variable) — Body text, UI labels, buttons, forms, navigation. Default.
- **Geist Mono** (Vercel) — Wallet addresses, transaction hashes, technical data only.

### Scale

All Clash Display headlines scale fluidly with `clamp()` so marketing surfaces adapt from mobile to ultra-wide without media-query forks.

- **Hero** — `clamp(56px, 10vw, 120px)`, Clash Display 600, `leading-none`. Landing page H1 only. Mobile floor 56px, desktop cap 120px.
- **Section display** — `clamp(32px, 5vw, 72px)`, 600, `0.8px` tracking. Landing section headers (Trust / Participant / Host openers).
- **Browse hero** — `clamp(36px, 5vw, 52px)`, 600, `leading-none`. Browse + My Raffles page heroes. Cap is 52px — never scales to the landing 120px tier.
- **Page title** — `30–36px`, 600. Raffle detail title (32px), modal titles (30px), My Raffles H1 (36px).
- **Card-title heading** — `24px`, 600, `0.12px` tracking. Featured card titles, tab labels, card accordion headers.
- **Card title (raffle card)** — `15px`, 600, `leading-1.2`. The raffle name inside a browse-grid card.
- **Card price** — Clash Display `19px / 600 / #182135`, `0.1px` tracking. The headline dollar figure on raffle cards.
- **Body large** — `18px / leading-8`, 500. Footer, emphasized hero sub-copy, bullet lists inside section cards.
- **Body** — `15px / leading-7`, 400. Default body. (Note: component `button` fonts use 13–14px with weight 500/600.)
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

4px base unit with a clean doubling scale (`4, 8, 16, 24, 32, 48, 64, 80`). Content max-width is **`1200px`** for both the landing chrome and the app chrome — wider layouts (`1440px`, `1720px`) are reserved for full-bleed marketing sections that ignore the container entirely (e.g. Trust section with its own rounded bleed).

### Container widths

- **Landing hero / section containers** — `max-width: 1200px`, horizontal padding `48px` desktop / `24px` mobile.
- **App surfaces** (browse, my-raffles, raffle detail) — `max-width: 1200px`, horizontal padding `32px` desktop / `24px` mobile.
- **Trust section full-bleed** — margin-inline `24px`, inner padding `80px 48px`, `rounded-[80px]`.

### Section rhythm

- **Section vertical padding** — `80px` (`py-20`) both breakpoints.
- **Inter-section gap** (landing) — `60px` between hero + trust + participant + host + CTA blocks.
- **Card padding** — `14px` (raffle card) · `16px` (default) · `24px` (content / subscription cards) · `64px 56px` (landing section cards).
- **Card gap** (grid) — `16px` siblings, `14px` stats grids, `32px` detail sidebar split.

### Navbar metrics

- **App navbar** — height `56px`, `1px solid #141416` bottom border, padding `0 24px`, sticky `z-20`.
- **Landing navbar** — height `64px`, `1px solid #141416` bottom border, padding `0 48px`, sticky `z-20`.
- **Navbar divider** (between logo and links) — `1px × 28px` in `gray-150` `#e6e8ec`.

### Component heights (quick reference)

- **CTA button (landing)** — `60px`, **rounded `10px`**, 2px border, padding `0 28–36px` (context-dependent), `font-size 18` — the signature landing-page button. **Not pill-rounded.**
- **Primary button (default)** — `36px` (`h-9`), pill `rounded-full`, padding `0 16px`, `font-size 14`.
- **Primary button (sm)** — `32px` (`h-8`), padding `0 12px`, `font-size 13`.
- **Primary button (lg)** — `40px` (`h-10`), padding `0 24px`, `font-size 14`.
- **Raffle-card CTA** — `44px` (`h-11`), 2px border, outline variant, `font-size 13 / weight 600`.
- **Detail-page "Buy tickets" CTA** — `56px` (`h-14`), `rounded-full`, `font-size 16 / weight 600`.
- **Input field** — `36px` (`h-9`), `rounded-md`.
- **Search bar** — `40px` (`h-10`), `rounded-full`, padding `0 16px`.
- **Selection card** (payment method / chain selector) — `56px` (`h-14`), `rounded-lg`.
- **Counter button** (`+` / `−` inside ticket stepper) — `48px × 48px`, transparent bg, 1px divider.

### Raffle-card internal metrics

- Shell: `width 220px`, `border-radius 16px 16px 24px 24px` (asymmetric — top corners `16`, bottom `24`), `1px solid transparent` → `1px solid #141416` on hover.
- Cover image: aspect-ratio `16/9`, rounded `16px 16px 0 0`, object-cover.
- Body padding: `14px`, internal `gap 12px`.
- Role tag: position absolute top/right `8px`, rounded **`8px`** (not full), padding `2px 10px`, `font-size 11 / weight 600`.
- Verified badge: `1px solid #141416`, rounded **`6px`**, padding `2px 6px`, `font-size 11`, 11×11 icon.
- Progress bar: height `10px`, rounded `6px`, track `#eeeeee`, fill `#84dcff`.
- Card title: `15px / 1.2 / 600`. Host name: `13px`. Price: Clash Display `19px / 600` `#182135`. Time / status text: `12–13px` in `#7b7b7b`.

### Breakpoints

Tailwind defaults: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Mobile-first; container widths collapse below `640`, navbar padding drops to `24px`, grid cards reflow to `repeat(auto-fill, minmax(240px, 1fr))`. Profile surfaces call out a fluid tablet range `768–1024px` for sidebar layout.

## Elevation & Depth

**Flat-first.** Depth is communicated through:

1. **Borders over shadows.** Cards use a transparent 2px border that reveals as solid black on hover (`border-2 border-transparent hover:border-black`) — tactile feedback without z-axis lift.
2. **Restrained shadow ramp.** Four tokens only: `shadow-xs` (outlines), `shadow-sm` (inputs), `shadow-md` (dropdowns / popovers), `shadow-lg` (dialogs). Used exclusively for overlays.
3. **Color layering** on the landing page. Large rotated pastel blocks sit behind content to imply depth without blur.
4. **Focus rings.** 3px ring at `ring/50` on `:focus-visible` — depth for keyboard users that the mouse never sees.

No glassmorphism. No backdrop blur. No heavy drop shadows in the product UI.

### Z-index ladder

sticky navbar `z-20` · sticky filter `z-10` · dropdown / popover `z-50` · dialog `z-50` · toast `z-[60]`.

## Shapes

Base radius is **`0.625rem` (10px)**. Nothing is square.

- **`sm`** 6px — small chips, inner elements, verified-host badge, progress bars
- **`md`** 8px — inputs, dropdown triggers, role tags, small badges, featured-card promo badge
- **`lg`** 10px — cards, containers (base `--radius`), **landing CTA buttons** (intentional non-pill)
- **`xl`** 14px — detail-page stat cards, compact content cards
- **`2xl`** 18px — modal surfaces, raffle-detail content cards, past-draw cards
- **`3xl`** 24px — featured cards, raffle-card bottom corners (asymmetric top/bottom)
- **`4xl`** 26px
- **`full`** 9999px — **buttons (default / sm / lg / icon), standard pills, status dots, credit chip**

### Per-surface radius overrides

- **Raffle card** — asymmetric `16px 16px 24px 24px` (top corners `16`, bottom `24`). Emphasises the "card grows downward" silhouette.
- **Landing CTA button** — `10px` with 2px border. Reinforces weight and anchors the hover-invert flip. Pill-rounded buttons remain the default everywhere else.
- **Landing section cards** (Participant / Host) — `80px` outer radius with a 2px black border. **Never** `120px` — the marketing bleed cap is 80, not 120, in this iteration.
- **Trust-section bleed** — `80px` outer radius on the full `#c4edff` background.
- **Stats card** (landing steps) — `24px` with 2px black border, padding `16px 20px`.

Large marketing surfaces cap at `rounded-[80px]` — **landing page only**. Never inside application chrome.

Icon artwork: **2px stroke, rounded caps** (lucide-react defaults).

## Components

Organized by **atomic design** hierarchy. The frontmatter tokens are grouped by the same boundary markers.

### Atoms

Single-concept primitives. Cannot be broken down further without losing function.

- **Color swatch** — any entry in §Colors. Composes everything else.
- **Type level** — any entry in §Typography. Never mixed inside one atom.
- **Radius step** — any entry in §Shapes.
- **Spacing step** — 4px unit scale from §Layout.
- **Icon** — lucide-react stroke icon (default 16px), or a `@web3icons/react` brand mark, or a custom SVG from `src/assets/` (`logo`, `logo-icon`, `ticket-icon`, `earnm-coin`, `bug-icon`, background cubes).
- **Focus ring** — 3px `ring/50` on `:focus-visible`. Used across every interactive atom.
- **Shadow step** — `shadow-xs`, `-sm`, `-md`, `-lg`.
- **Button shell** — the un-themed pill: `inline-flex rounded-full text-sm font-medium transition-all`. Resolves to a molecule only when paired with a fill + size.
- **Input field** — `h-9 w-full rounded-md border bg-transparent px-3 py-1`. Number inputs auto-select on focus (project convention).
- **Progress track** / **progress fill** — a solid bar and its colored overlay, composed together as the `progress-bar` molecule.
- **Status dot** — 8px `rounded-full` circle in `green-live`. Composed into the Live pill molecule.
- **Logo mark** — standalone four-petal pinwheel (`logo-icon.svg`, 54×54).
- **Wordmark** — custom "RAFLI" geometric sans-serif with a triangular crossbar on the **A** (112×22). Used inside the full logo and independently.

### Molecules

2–5 atoms bound together to serve one UI job.

- **Button** — `button shell` + fill color + size + label. Variants:
  - **Primary** — `bg-rafli-black text-white`, `h-36 / px-16 / rounded-full / text-14 / weight-500`. _Default for any CTA in app chrome._
  - **Primary Lg** — `h-40 / px-24 / rounded-full`.
  - **Primary Sm** — `h-32 / px-12 / font-size 13 / rounded-full`.
  - **CTA (landing only)** — **`h-60 / rounded-10 / border-2 rafli-black / padding 0 28–36px / font-size 18 / weight-500`**. Hover _inverts_ to white fill with black text. This is the signature landing-page CTA — note the `10px` radius and 2px border, not pill-rounded.
  - **Outline** — `h-36 / rounded-full / 1px solid rafli-black / bg-transparent` for secondary actions beside a primary. On the raffle-card bottom row escalates to `h-44 / border-2`.
  - **Ghost** — text-only hover tint, used in dense toolbars (`h-36 / rounded-full`).
  - **Destructive** — `bg-destructive text-white` for deletes (`h-36`).
  - **Link** — primary cyan with underline on hover (offset 4px).
  - **Icon** — `36 × 36` square pill with an icon atom, no label.
- **Badge** — `rounded-full border px-2.5 py-0.5 text-xs font-semibold`. Variants: default (`rafli-black` fill, white text — used for notification counters, unread chips, emphasis pills), secondary (muted fill), outline (border only). **Never fill Badges with `primary` cyan** — cyan is for links / progress / selection, not chrome surfaces.
- **Role pill** — badge specialised by role. **`rounded-8px` (not pill)**, padding `2px 10px`, `font-size 11 / weight 600`. Sits absolutely positioned top-right of the raffle-card cover image.
  - **Host** — `bg-yellow-light text-gold`.
  - **Participant** — `bg-rafli-green text-green-600`.
- **Status pill** — a badge + lucide icon + label. Six colors (live / scheduled / ended / completed / auto-cancelled / cancelled). Carry a **Live status dot** (8px `green-live` circle, cream background, 1px black border). Pill-rounded.
- **Verified-host badge** — `1px solid #141416`, **`rounded-6px` (not pill)**, padding `2px 6px`, `font-size 11`, 11×11 checkmark icon inline. One consistent micro-badge across browse cards, featured cards, and host rows.
- **Progress bar** — `progress-track` + `progress-fill`. Height **`10px`**, rounded `6px` (not pill), track `gray-75` `#eeeeee`, fill `cyan` `#84dcff`. Detail page uses a slightly taller `12px` variant for the hero prize ticker.
- **Form field** — `label` + `input` atom + optional hint. Error state swaps border to `destructive`, hint text to `destructive`.
- **Search bar** — `input` + leading icon inside a full-rounded pill container.
- **Selection card** — `label` + radio-style row at h-56, rounded-lg. Used for payment-method and chain selectors.
- **Countdown digit** — single Clash Display 36px character on `rafli-yellow` ground, animated with framer-motion `popLayout`. Composes into the timer organism.
- **Trustpilot stars** — 5-glyph row of lucide `Star` icons, filled for earned rating.

### Organisms

Multi-molecule compositions that make up whole sections or standalone product surfaces.

- **Raffle card** — the flagship organism. Composition: cover image (object-cover square) → **status pill** → **card title** → **host row** (`avatar` + name + **role pill** + **verified-host badge**) → **progress bar** → **countdown timer** → **primary button**. Shell is `rounded-2xl border-2 border-transparent bg-white` — 2px black border reveals on hover. The hover-invert primary CTA lives inside this card.
- **Countdown timer** — default: `bg-rafli-yellow` with Clash Display 36px digits, animated per tick. Urgent state (≤10 min): swaps to `bg-amber-50 border-amber-200` with a "FINAL 10 MINUTES" label.
- **Winner card** — portrait image + winner name + prize + ticket-code (mono) + verification link.
- **Past draw card** — slim summary row for concluded raffles (image thumb + title + winner link + date).
- **Content card** — How It Works / Reviews / Stats surfaces. Larger padding (`24px`), `rounded-2xl`, carries illustration or stat.
- **Subscription plan card** — plan-tier card with Clash Display price, feature list, pill CTA. Plan-highlight variant fills with `rafli-green` or `rafli-yellow`.
- **Navbar** — sticky `z-20`, max-width 1440px, cream background, `px-6 / lg:px-[100px]`. Holds `logo` + nav links + user-mode toggle pill + icon buttons.
- **Public navbar** — unauthenticated variant: cream bg with Sign in + Sign up buttons.
- **Mobile nav overlay** — full-viewport `bg-rafli-green` panel with Clash Display `text-4xl` links. A single brand color flooding the small-screen surface is intentional — it reinforces identity on the device where the user spends most time.
- **Marquee banner** — horizontal auto-scroll (`animation: marquee 20s linear infinite`, 0% → −50% X). Sits below the navbar on marketing surfaces.
- **Hero section** — the landing page opener. Composition: **Cube Trio** (three overlapping shapes in blue / green / yellow, rotated & scaled) + Clash Display hero headline (GSAP SplitText reveal: 1.25s, 50ms stagger, `power3.out`) + CTA button + optional sub-copy.
- **Trust section** — large pastel section background (`rounded-[120px]`, `bg-rafli-blue`) with step cards stacked inside. Uses **Rafli Yellow** callouts on individual steps.
- **Prize breakdown card** — hero-style numeric display of prize value in Clash Display, backed by `yellow-warm` highlight block.
- **Footer** — cream background with logo + navigation links + audit logos + legal disclaimer + accent-cube decoration in corners.

### Motifs (brand assets referenced by organisms)

- **Cube Trio** — three overlapping geometric shapes in `rafli-blue` / `rafli-green` / `rafli-yellow`, positioned with slight rotation and scale. Appears in hero, modal success states, 404, create/export confirmation, footer corners. Always rendered as a trio — **never solo**.
- **GSAP SplitText hero reveal** — character-by-character text animation. 1.25s duration, 50ms stagger, `power3.out`. Landing hero only.
- **Framer-motion `popLayout` ticks** — countdown digits animate on tick for subtle movement. Never decorative — always carries state.

## Do's and Don'ts

### Colors

- **Do** use the accent trio (`rafli-blue` + `rafli-green` + `rafli-yellow`) together as a set in decorative surfaces.
- **Don't** substitute a different yellow for `rafli-yellow` — it is the single most recognizable brand color.
- **Do** default CTAs, notification badges, unread chips, and any high-emphasis filled surface to `rafli-black` (`#141416`). The cyan `--primary` token is for links, progress fills, and selection states — **not buttons, not badges**.
- **Don't** use pure white as a page background. White is only for card surfaces on the cream canvas.
- **Do** pair yellow backgrounds with near-black text to keep WCAG AA contrast.

### Typography

- **Don't** set Clash Display below 18px — it loses character and Geist Sans reads better.
- **Do** use `leading-none` for all Clash Display headlines and `leading-7` for all paragraph body.
- **Don't** mix more than two Clash Display sizes in one view — the brand personality is loud; give it breathing room.

### Shape & elevation

- **Do** round every interactive surface. Buttons are always `rounded-full`; inputs always `rounded-md`; cards always `rounded-2xl`.
- **Don't** apply `rounded-[120px]` anywhere outside landing-page marketing surfaces.
- **Do** use the 2px transparent→black border hover pattern on raffle cards. It's the product's signature tactile cue.
- **Don't** stack drop shadows to imply hierarchy. Reach for borders or distinct surface tone instead.

### Components

- **Do** respect the atomic hierarchy: atoms → molecules → organisms. New components should compose existing atoms before introducing new ones.
- **Don't** mix solid-surface buttons and outlined buttons in the same action group — pick one emphasis tier.
- **Do** maintain the black↔white CTA hover flip on the landing button. It's the single most recognizable interaction in the product.
- **Don't** ship a new raffle-card status without updating the six-color status-pill taxonomy (live / scheduled / ended / completed / auto-cancelled / cancelled).
- **Do** use the verified-host badge whenever host identity is shown — trust is the product's value proposition.

### Motion & voice

- **Don't** animate decoratively. Motion is reserved for state changes that carry information: countdown ticks, hero headline reveal, card hover borders.
- **Do** keep copy direct and grounded. "Raffles! Done right!" not "Welcome to the future of raffles." "Real prizes. Verified draws. Enter in seconds." not "Amazing prizes waiting for you!"
- **Don't** use crypto jargon ("on-chain settlement", "provably fair") in participant-facing copy — it belongs in host-facing and technical-reference surfaces only.
