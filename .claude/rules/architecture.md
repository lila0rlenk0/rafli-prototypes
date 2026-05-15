---
paths:
  - 'src/**/*.{ts,tsx}'
---

# Architecture

Thin BFF. Next.js calls the backend HTTP API via `@/lib/api`. Zero business logic in this repo — validation, auth, persistence live backend-side.

## Folder structure

```
src/
  app/                  App Router — pages, layouts, special files
    (admin)/            route groups — no URL impact
    (auth)/             unauthenticated flows
    (protected)/        authenticated shell
    (landing)/ (public) marketing + public
  assets/               SVG components (logo, icons)
  components/
    ui/                 shadcn stock — never hand-edit
    ui-custom/          app shell pieces that extend shadcn (navbar, lightbox) — not CLI-managed
    <domain>/           auth, raffle, host, payment, filters, ...
  services/             server actions — one domain per folder
    <domain>/<action>.ts
  lib/
    api/                HTTP clients (base / authenticated / browser)
    auth/               session, JWT, cookies
    cache/              revalidation helpers
    errors/             error types + domain mappers
    query/              React Query client + serviceError bridge
    sentry/             capture + beforeSend filter
    hooks/              custom hooks
    utils/ utils.ts     cn() + general utilities
  providers/            React context providers
  store/                Zustand (vanilla createStore + provider)
  types/                Zod schemas, inferred types, error codes
  env/                  @t3-oss/env-nextjs schemas
  proxy.ts              middleware — redirects only, no auth logic
tests/integration/      server action integration tests
```

## Dependency direction

- `app/` consumes `components/`, `services/`, `lib/`
- `components/<domain>/` composes `components/ui/` — never reaches into another domain
- `services/` imports `lib/api`, `lib/errors`, `lib/sentry`, `types/`
- `lib/`, `types/`, `env/` are leaves — imported by any layer
- `components/ui/` never depends on domain code
- no circular imports — enforced by layer direction

## File naming

- kebab-case: `raffle-card.tsx`, `use-my-raffles.ts`, `create-raffle.ts`
- one concern per file — split past ~200 lines
- barrel files only for cohesive modules (`@/lib/errors`, `@/types/errors`)

## Exports

- named exports for components, actions, hooks, utilities
- default export only for App Router specials: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`
- no wildcard `*` re-exports except inside declared barrels

## Imports

- `@/` alias — never relative paths crossing more than one level (`../../`)
- direct paths (`@/components/ui/button`) — barrels only where declared
