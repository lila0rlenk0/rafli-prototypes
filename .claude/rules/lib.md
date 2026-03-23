---
paths:
  - 'src/lib/**'
---

# Lib

Infrastructure utilities. API clients, error handling, auth, caching, analytics, Sentry.

## Directory

- `api/` — HTTP clients (`baseClient`, `authenticatedClient`, `browserClient`)
- `auth/` — session management, JWT utilities, cookie config
- `cache/` — revalidation helpers (`revalidateMyRaffles`, `revalidateRaffleDetail`, `revalidateWinningPaths`)
- `errors/` — error types, domain mappers, `success()`/`failure()` helpers
- `query/` — React Query client and `serviceError()` bridge
- `sentry/` — `captureServiceError` helper and `beforeSend` filter
- `analytics/` — Mixpanel integration
- `hooks/` — custom React hooks
- `permissions.ts` — permission constants (`raffle:create`, `raffle:manage`, `raffle:participate`)
- `notification-stream.ts` — WebSocket client for real-time notifications
- `web3/` — Wagmi/RainbowKit config (feature-gated by `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`)
- `utils/` — general utilities (date formatting, etc.)
- `utils.ts` — Tailwind `cn()` helper

## React Query Defaults

Configured in `@/lib/query/client`:

- `staleTime: Infinity` — data never auto-stales
- All auto-refetch disabled (`refetchOnMount`, `refetchOnWindowFocus`, `refetchOnReconnect` all false)
- GC time: 5 minutes
- Queries must be manually invalidated on mutation via `queryClient.invalidateQueries()`

## Per-Request Deduplication

`getCurrentUser` in `@/lib/auth/session` is wrapped with `React.cache()` — multiple calls within one server request execute only once. Prefer `getCurrentUser` over raw `getSession()` in server components to avoid redundant JWT decoding.

## Rules

- Map errors through domain-specific mappers — never expose implementation details to consuming layers
- Never leak internal HTTP/Axios details to components
