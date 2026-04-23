---
paths:
  - 'src/lib/**/*.{ts,tsx}'
---

# Lib

Infrastructure layer. Leaf dependency — imported by services, components, hooks, pages.

## Folders

- `api/` — HTTP clients: `client.ts` (server), `browser-client.ts` (OAuth only)
- `auth/` — session management, JWT verification, cookie helpers (`constants.ts`)
- `cache/` — `revalidatePath` / `revalidateTag` wrappers keyed by cache tag constants
- `chat/` — chat WebSocket (`stream.ts`), event dispatcher (`event-dispatch.ts`)
- `errors/` — error types, domain mappers, `success()` / `failure()` helpers
- `notifications/` — notification WebSocket client (`stream.ts`)
- `query/` — React Query client, `serviceError()` bridge to mutations
- `sentry/` — `captureServiceError`, `captureContractDrift`, `beforeSend` filter
- `analytics/` — Mixpanel client
- `hooks/` — custom React hooks (one per file, `use-<kebab>.ts`)
- `permissions.ts` — permission constants
- `feature-flags.ts` — compile-time feature switches
- `web3/` — Reown AppKit + wagmi, route-gated to `/browse/[slug]` (`format/`, `config/`, `payment/`, `errors.ts` at root)
- `utils/` — general utilities at root (`run-after`, `ui-constants`); `format/`, `raffle/`, `media/`, `routing/` for grouped modules
- `class-names.ts` — Tailwind `cn()` helper only (root)
- `verification/` — verification UI helpers, explorer links

## Rules

- `getCurrentUser` (React.cache-wrapped) over raw `getSession()` in server components
- map errors through domain-specific mappers — never expose HTTP/Axios internals
- never leak raw error shapes to components — always return `ServiceResponse`
- server-only modules (`lib/api/*`, `lib/auth/*`) must `import 'server-only'` at the top
- one hook per file in `lib/hooks/`, named `use-<kebab>.ts`
