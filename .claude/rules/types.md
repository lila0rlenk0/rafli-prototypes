---
paths:
  - 'src/types/**'
---

# Types

Zod schema-first. Single source of truth for data contracts.

## Directory

- `errors/` — error codes by domain
- `service-response.ts` — `ServiceResponse<T, E>`
- `pagination.ts` — reusable pagination schema
- `[domain].ts` — entity schemas

## File Order

constants (`as const`) → types from constants → Zod schemas → inferred types (`z.infer<>`) → query schemas

## Rules

- schema first, then `z.infer<>` — never manual interfaces without backing schema
- `as const` for constant objects
- `.extend()` for schema composition
- error code format: `<domain>:<scope>:<specific>` (matches backend RFC 7807)
