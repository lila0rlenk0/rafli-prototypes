---
paths:
  - 'src/lib/**/*.{ts,tsx}'
---

# Lib

Infrastructure layer. Leaf dependency — imported by services, components, hooks, pages.

## Folders

- `api/` — HTTP clients: `baseClient`, `authenticatedClient`, `browserClient`
- `auth/` — session management, JWT verification, cookie helpers
- `cache/` — `revalidatePath` / `revalidateTag` wrappers keyed by cache tag constants
- `errors/` — error types, domain mappers, `success()` / `failure()` helpers
- `query/` — React Query client, `serviceError()` bridge to mutations
- `sentry/` — `captureServiceError`, `captureContractDrift`, `beforeSend` filter
- `analytics/` — Mixpanel client
- `hooks/` — custom React hooks (one per file, `use-<kebab>.ts`)
- `permissions.ts` — permission constants
- `notification-stream.ts` — WebSocket client
- `web3/` — Reown AppKit + wagmi, route-gated to `/browse/[slug]`
- `utils/` — general utilities
- `utils.ts` — Tailwind `cn()` helper only

## Rules

- `getCurrentUser` (React.cache-wrapped) over raw `getSession()` in server components
- map errors through domain-specific mappers — never expose HTTP/Axios internals
- never leak raw error shapes to components — always return `ServiceResponse`
- server-only modules (`lib/api/*`, `lib/auth/*`) must `import 'server-only'` at the top
- one hook per file in `lib/hooks/`, named `use-<kebab>.ts`
