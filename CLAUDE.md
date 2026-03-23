# Rafli

Next.js raffle platform. Clean Architecture with Zod-first types.

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS v4 (CSS-first config in `globals.css`, no `tailwind.config`)
- Bun runtime and package manager — never npm/yarn/pnpm
- `@tanstack/react-query` v5, Zustand, Zod
- Custom JWT auth (no NextAuth, no middleware)

## Commands

- `bun run dev` — development server
- `bun run format && bun run lint && bun run test` — required after every change
- `bun run format:check` — CI check (no writes)
- `bun run test:e2e` — Playwright E2E tests
- `bun run build` — production build

## Architecture

```
src/
  app/           — Next.js App Router (pages, layouts, routes)
  components/    — UI (Server + Client components)
  services/      — Server actions wrapping API calls
  types/         — Zod schemas, inferred types, error codes
  lib/           — Utilities, API clients, errors, auth, cache, hooks
  providers/     — React context providers
  store/         — Zustand client state (vanilla createStore + provider)
  env/           — @t3-oss/env-nextjs parsed environment variables
```

## Golden Rules

- Server Components by default
- All API calls via server actions (`'use server'`)
- Zod schema-first — define schema, infer type with `z.infer<>`
- `ServiceResponse<T, E>` for all service returns — `success(data)` / `failure(errorCode)`
- Use `function` declarations, not arrow functions (arrows OK in hook callbacks and shadcn/ui primitives)
- Use `@/env/server` or `@/env/client` for environment variables — never `process.env` directly
- Use underscores in large numbers (`1_000_000`)
- Write code and comments in English
- JSDoc with `@returns` on all exports
- No `any` without justification

## Auth Model

Cookie-based custom JWT. Three cookies: `raffly-token` (httpOnly JWT), `raffly-session` (client-readable user JSON), `raffly-user-mode` (participant/host). Session helpers in `@/lib/auth/session`: `getSession()`, `getCurrentUser` (cache-wrapped), `requireAuth()`, `requireEmailVerification()`.

## Caching

- Revalidation TTLs in `@/lib/api/config` — `MY_RAFFLES: 60s`, `RAFFLE_DETAIL: 300s`, `CATEGORIES: 3_600s`. Cache tags exist for `MY_RAFFLES` and `RAFFLE_DETAIL` only
- Revalidation helpers in `@/lib/cache/revalidation`
- React Query — `staleTime: Infinity`, all auto-refetch disabled, manual invalidation on mutation

## Imports

- Direct paths preferred (`@/components/ui/button`)
- Barrel re-exports (`index.ts`) only for cohesive modules (`@/lib/errors`, `@/types/errors`)
- `lucide-react` uses barrel imports — relies on `optimizePackageImports` in `next.config.ts` for tree-shaking

## Next.js

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Training data is outdated — the docs are the source of truth.

## Git

- Read-only by default — no git operations unless explicitly requested
- Use `gh` CLI for all GitHub operations
- Conventional Commits — derive type, scope, message from the diff

## AGENTS.md

@AGENTS.md
