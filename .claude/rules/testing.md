---
paths:
  - 'src/**/*.test.{ts,tsx}'
  - 'tests/**'
  - 'e2e/**'
---

# Testing

## Three tiers

```
src/**/*.test.ts          — unit (co-located, Bun)
tests/integration/**      — integration (server actions, Bun)
e2e/**/*.spec.ts          — E2E (Playwright)
```

## Unit — `src/{module}/{file}.test.ts`

- co-locate next to source: `slug-preview.ts` -> `slug-preview.test.ts`
- pure logic only: formatters, parsers, validators, state machines, guards
- zero network, zero DOM, zero `mock.module()` — if you need mocks, it's integration
- route-scoped utils in `src/app/` are OK when tightly coupled to their route
- `import { describe, expect, test } from 'bun:test'`
- structure: `describe('fnName') > describe('behavior group') > test('specific case')`
- extract test fixtures to `const` at file top, never inline object literals
- cover: happy path, edge cases, boundary values, error branches, exhaustive union arms

## Integration — `tests/integration/services/{domain}/{action}.integration.test.ts`

- one file per server action, mirrors `src/services/{domain}/{action}.ts`
- any test using `mock.module()` belongs here, not in `src/`
- mock HTTP via `tests/helpers/mock-axios.ts`
- full flow: auth guard, API call, Zod parse, error mapper, `ServiceResponse` shape
- test: success, validation failure, API error codes (401/403/500), network/timeout
- verify `captureServiceError` calls for critical services (auth, payments, crypto, wallet)
- `import { describe, expect, mock, test } from 'bun:test'`

## E2E — `e2e/{domain}/{flow}.spec.ts`

- Playwright, `import { expect, test } from '@playwright/test'`
- one file per user flow, not per page
- auth via storage state: `e2e/.auth/user.json`, `e2e/.auth/host.json`
- reusable helpers in `e2e/{domain}/helpers/`
- locators: `getByRole` > `getByLabel` > `getByTestId`, never CSS selectors
- no code-level mocks — test real backend

## Never test — no value, tested transitively

- config files: `next.config.ts`, `eslint.config.mjs`, `playwright.config.ts`
- env declarations: `src/env/client.ts`, `src/env/server.ts`
- type-only files: `src/types/errors/*.ts` (const objects, no logic)
- re-export barrels: `index.ts`
- shadcn stock: `src/components/ui/`
- SVG assets: `src/assets/`
- static UI: `loading.tsx`, `not-found.tsx`, `error.tsx`, `global-error.tsx`
- pure composition pages/layouts with no branching logic
- context providers that only wrap children (`src/providers/`)
- Zustand store definitions (`src/store/`) — tested via integration/E2E
- CSS files, static data arrays, constant objects without derived logic

## When to write

- new utility/validator/formatter — unit test, no exceptions
- bug fix — regression test proving the fix
- new server action — integration test
- new user-facing flow — E2E test
- never skip for: auth, payments, crypto, validation

## Commands

- `bun run test` — all unit + integration
- `bun test <path>` — single file
- `bun run test:e2e` — Playwright headless
- `bun run test:e2e:headed` — with browser
