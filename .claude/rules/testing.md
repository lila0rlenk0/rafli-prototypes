---
paths:
  - 'src/**/*.test.{ts,tsx}'
  - 'tests/**'
---

# Testing

Two tiers:

```
src/**/*.test.ts          unit (co-located, Bun)
tests/integration/**      integration (server actions, Bun)
```

## Unit — `src/{module}/{file}.test.ts`

- co-locate next to source: `slug-preview.ts` → `slug-preview.test.ts`
- pure logic only: formatters, parsers, validators, state machines, guards
- zero network, zero DOM, zero `mock.module()` — if you need mocks, it's integration
- route-scoped utils in `src/app/` are OK when tightly coupled to their route
- `import { describe, expect, test } from 'bun:test'`
- structure: `describe('fnName') > describe('behavior group') > test('specific case')`
- extract fixtures to `const` at file top — never inline object literals
- cover: happy path, edge cases, boundary values, error branches, exhaustive union arms

## Integration — `tests/integration/services/{domain}/{action}.integration.test.ts`

- one file per server action, mirrors `src/services/{domain}/{action}.ts`
- any test using `mock.module()` belongs here, not in `src/`
- mock HTTP via `tests/helpers/mock-axios.ts`
- full flow: auth guard → API call → Zod parse → error mapper → `ServiceResponse` shape
- test: success, validation failure, API error codes (401/403/500), network/timeout
- verify `captureServiceError` calls for critical services (auth, payments, crypto, wallet)
- `import { describe, expect, mock, test } from 'bun:test'`

## Never test

- config files: `next.config.ts`, `eslint.config.mjs`
- env declarations: `src/env/client.ts`, `src/env/server.ts`
- type-only files (const objects, no logic)
- re-export barrels
- shadcn stock: `src/components/ui/`
- SVG assets: `src/assets/`
- static UI: `loading.tsx`, `not-found.tsx`, `error.tsx`, `global-error.tsx`
- pure composition pages/layouts with no branching
- context providers that only wrap children
- Zustand store definitions — covered via integration
- CSS, static data arrays, constants without derived logic
- client hooks wrapping useEffect around already-tested pure logic — extract logic, test pure

## When to write

- new utility / validator / formatter — unit, no exceptions
- bug fix — regression test proving the fix
- new server action — integration
- never skip for: auth, payments, crypto, validation

## Forbidden

- `test.only` / uncommented `test.skip` in committed code
- snapshot tests — they break on every change and teach nothing
- shared mutable state across tests

## Commands

- `bun run test` — all unit + integration
- `bun test <path>` — single file
