---
paths:
  - 'src/**/*.tsx'
---

# Motion

Powered by `tw-animate-css` + native Tailwind transitions. GSAP via `@gsap/react` for landing-only choreography.

## Transitions

- `transition-colors` over `transition` — targets the property, avoids repainting unrelated styles
- `duration-150` for micro-interactions, `duration-300` for layout shifts
- animate only `transform` and `opacity` — other properties trigger layout

## Loading + skeletons

- spinner: `animate-spin` on an SVG — never on a `<div>`
- skeleton: `animate-pulse` on a muted-background block with fixed dimensions
- never stack `animate-*` with `transition-transform` on the same element

## Enter / exit (tw-animate-css)

- compose `animate-in` / `animate-out` with effect classes:
  - enter: `animate-in fade-in slide-in-from-bottom-4 duration-300`
  - exit: `animate-out fade-out slide-out-to-bottom-4 duration-200`
- decimal offsets use arbitrary syntax: `slide-in-from-bottom-[0.625rem]` — `2.5` does not parse

## Motion preferences

- gate decorative motion with `motion-safe:` — respects `prefers-reduced-motion`
- kill transforms via `motion-reduce:transition-none` on translate/scale elements
- custom keyframes live in `@theme` in `globals.css` — never inline `<style>`

## GSAP

- `useGSAP()` from `@gsap/react` — handles cleanup on unmount
- scope animations to a ref container — never target global selectors
- only for landing / marketing surfaces — never inside the app shell
