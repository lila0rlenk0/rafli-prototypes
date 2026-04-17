---
paths:
  - 'src/**/*.test.{ts,tsx}'
  - 'tests/**'
  - 'e2e/**'
---

# Testing

Three tiers:

```
src/**/*.test.ts          unit (co-located, Bun)
tests/integration/**      integration (server actions, Bun)
e2e/**/*.spec.ts          E2E (Playwright)
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

## E2E — `e2e/{domain}/{flow}.spec.ts`

- Playwright, `import { expect, test } from '@playwright/test'`
- one file per user flow, not per page
- auth via storage state: `e2e/.auth/user.json`, `e2e/.auth/host.json`
- reusable helpers in `e2e/{domain}/helpers/`
- locators: `getByRole` > `getByLabel` > `getByTestId` — never CSS selectors
- no code-level mocks — test against the real backend
- unique IDs per test via `crypto.randomUUID()` — never hardcoded
- negative path mandatory — at least one failure assertion per spec
- assert list re-renders after mutations — catches missing `revalidatePath`

## Bug-catching mindset (E2E)

A passing test proves nothing if it only asserts "something rendered". Every test must be able to fail for a real reason.

- assume mutations can silently no-op — read back via API after every write
- assume redirects render stale RSC — re-navigate to the list and re-assert
- assume gates can be bypassed — include the negative path that should be rejected
- state transitions assert three things: new state visible, prior action no longer available, next valid action present

## Never test

- config files: `next.config.ts`, `eslint.config.mjs`, `playwright.config.ts`
- env declarations: `src/env/client.ts`, `src/env/server.ts`
- type-only files (const objects, no logic)
- re-export barrels
- shadcn stock: `src/components/ui/`
- SVG assets: `src/assets/`
- static UI: `loading.tsx`, `not-found.tsx`, `error.tsx`, `global-error.tsx`
- pure composition pages/layouts with no branching
- context providers that only wrap children
- Zustand store definitions — covered via integration/E2E
- CSS, static data arrays, constants without derived logic
- client hooks wrapping useEffect around already-tested pure logic — extract logic, test pure

## When to write

- new utility / validator / formatter — unit, no exceptions
- bug fix — regression test proving the fix
- new server action — integration
- new user-facing flow — E2E
- never skip for: auth, payments, crypto, validation

## Forbidden

- `test.only` / uncommented `test.skip` in committed code
- `page.waitForTimeout` — wait on locators, URLs, or API responses
- snapshot tests — they break on every change and teach nothing
- shared mutable state across tests
- bare `fetch()` in E2E — use `apiRequest.newContext()`

## Commands

- `bun run test` — all unit + integration
- `bun test <path>` — single file
- `bun run test:e2e` — Playwright headless
- `bun run test:e2e:headed` — with browser
