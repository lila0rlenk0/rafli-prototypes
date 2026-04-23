# Rafli

Next.js raffle platform. Clean Architecture, Zod-first types.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS v4 (CSS-first in `globals.css`), Bun (never npm/yarn/pnpm), `@tanstack/react-query` v5, Zustand, Zod, custom JWT auth (no NextAuth)

## Commands

- `bun run dev` — dev server
- `bun run format && bun run lint && bun run test` — required after every change
- `bun run build` — production build
- `bun run test:e2e` — Playwright E2E

## Architecture

```
src/
  app/           — App Router pages, layouts, routes
  assets/        — SVG components (logo, icons, backgrounds)
  components/    — Server + Client components (ui/ is shadcn stock)
  services/      — server actions wrapping API calls
  types/         — Zod schemas, inferred types, error codes
  lib/           — utilities, API clients, errors, auth, cache, hooks
  providers/     — React context providers
  store/         — Zustand (vanilla createStore + provider)
  env/           — @t3-oss/env-nextjs environment variables
  proxy.ts       — lightweight middleware (auth redirects only)
tests/
  integration/   — server action integration tests (mock.module)
  helpers/       — shared mock utilities
e2e/             — Playwright E2E tests
```

## Rules

- Server Components by default
- all API calls via server actions (`'use server'`)
- Zod schema-first — define schema, infer with `z.infer<>`
- `ServiceResponse<T, E>` — `success(data)` / `failure(errorCode)`
- `function` declarations, not arrows (arrows OK in hook callbacks and shadcn primitives)
- `@/env/server` or `@/env/client` — never `process.env`
- underscores in large numbers (`1_000_000`)
- English code and comments, JSDoc with `@returns` on all exports
- no `any` without justification
- detailed rules in `.claude/rules/` — scoped by file path

## Auth

Cookie-based JWT. Cookies: `raffly-token` (httpOnly), `raffly-session` (client-readable user JSON), `raffly-user-mode` (participant/host). Helpers in `@/lib/auth/session`: `getSession()`, `getCurrentUser` (cache-wrapped), `requireAuth()`, `requireEmailVerification()`. Route guard in `src/proxy.ts` — redirects unauthenticated users, never handles auth logic.

## Caching

TTLs in `@/lib/api/constants`: `MY_RAFFLES: 60s`, `RAFFLE_DETAIL: 300s`, `CATEGORIES: 3_600s`. Tags for `MY_RAFFLES` and `RAFFLE_DETAIL` only. Revalidation in `@/lib/cache/revalidation`. React Query: `staleTime: Infinity`, auto-refetch disabled, manual invalidation.

## Imports

Direct paths (`@/components/ui/button`). Barrels only for cohesive modules (`@/lib/errors`, `@/types/errors`). `lucide-react` barrels tree-shaken via `optimizePackageImports`.

## Testing

Three tiers: unit (co-located `*.test.ts` in `src/`), integration (`tests/integration/`, uses `mock.module()`), E2E (`e2e/*.spec.ts`, Playwright). See `.claude/rules/testing.md` for full conventions.

## Next.js

Read relevant doc in `node_modules/next/dist/docs/` before any Next.js work.

@AGENTS.md
