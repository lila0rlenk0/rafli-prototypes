---
paths:
  - 'src/lib/**'
---

# Lib

Infrastructure utilities.

- `api/` — HTTP clients (`baseClient`, `authenticatedClient`, `browserClient`)
- `auth/` — session management, JWT, cookies
- `cache/` — revalidation helpers
- `errors/` — error types, domain mappers, `success()`/`failure()`
- `query/` — React Query client, `serviceError()` bridge
- `sentry/` — `captureServiceError`, `beforeSend` filter
- `analytics/` — Mixpanel
- `hooks/` — custom React hooks
- `permissions.ts` — permission constants
- `notification-stream.ts` — WebSocket client
- `web3/` — Wagmi/RainbowKit (feature-gated)
- `utils/` — general utilities
- `utils.ts` — Tailwind `cn()` helper

## Rules

- `getCurrentUser` (React.cache-wrapped) over raw `getSession()` in server components
- map errors through domain-specific mappers — never expose internals
- never leak HTTP/Axios details to components
