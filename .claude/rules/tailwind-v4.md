---
paths:
  - 'src/**/*.{tsx,css}'
---

# Tailwind v4

CSS-first. Theme lives in `src/app/globals.css` via `@theme inline` and CSS custom properties. No `tailwind.config.ts`.

## Globals.css order

1. `@import 'tailwindcss'`
2. `@import 'tw-animate-css'`
3. `@custom-variant dark (&:is(.dark *))`
4. `@theme inline { ... }` — tokens, fonts, typography scale, keyframes

## Theme tokens only

- semantic tokens: `bg-primary`, `text-muted-foreground`, `border-border`
- never arbitrary colors: no `bg-[#1a1a1a]`, `text-[13px]`
- never raw scales in product code: no `bg-blue-500`, `text-gray-400`
- missing token → add it to `@theme inline`, never inline

## v4 renames

- border radius: `rounded-xs`=2px, `rounded-sm`=4px, `rounded`=6px, `rounded-md`=8px — do not port v3 sizes blindly
- gradients: `bg-linear-to-r` (new), also `bg-radial`, `bg-conic`
- opacity: `bg-red-500/60` — `bg-opacity-*` removed
- line height: `text-base/7` — never `text-base leading-7`

## Shorthand

- `size-*` for equal width + height — never `w-8 h-8`
- `p-*` for uniform padding — never `px-* py-*` with same value
- `gap-*` not `space-x-*`/`space-y-*`
- `truncate` not `overflow-hidden text-ellipsis whitespace-nowrap`

## Z-index

- default scale (`z-0`, `z-10`, `z-30`, `z-50`) for common layers
- custom stacking contexts → add a token (`--z-modal`) in `@theme`, apply via `z-(--z-modal)`
- never arbitrary `z-[100]`

## Forbidden

- `tailwind.config.ts` (moved to CSS)
- inline `style={}` for layout or theming
- CSS modules or per-component `.css` files
- manual `dark:` overrides — semantic tokens handle theming
