---
paths:
  - 'src/**/*.{ts,tsx}'
---

# Scan Exclusions

- `src/components/ui/` — shadcn stock components, skip for eslint/TS suppression audits and complexity scans (LOC, nesting, god-object checks). Governed by `ui-primitives.md` instead

# Type Safety

- no `any`, `unknown`, `as unknown as T`, `as never`, or unsafe `as Type` casts
- no `@ts-ignore`, `@ts-expect-error`, or `eslint-disable` — fix the root cause
- prefer type guards (`is`, `in`, discriminated unions) over type assertions
- narrow with control flow: `if (!x) throw` or `if ('kind' in x)` — not `as`
- let TS infer return types for internal functions; annotate public API boundaries

## Function Complexity

- max ~50 SLOC per function — extract when exceeding
- max 4 nesting levels — flatten with early returns or extract helpers
- one responsibility per function: if you need "and" to describe it, split it
- prefer `switch` exhaustiveness (`default: never`) over `if/else if` for unions
- replace boolean params with named options objects or separate functions

## Control Flow

- early return on invalid state — no deep `if/else` pyramids
- guard clauses at function top: validate, throw/return, then happy path
- no `else` after `return`/`throw` — the branch already exited
- no nested ternaries — use `if/else` or extract to a named variable
- delete unused imports, variables, functions, types — never comment out
- no empty catch blocks — log or re-throw; if truly intentional, comment why

## Data Handling

- prefer `readonly` arrays/properties for data that shouldn't mutate
- destructure at the call site, not deep inside the function body
- no magic numbers/strings — extract to named `const` with comment explaining value
- prefer `Map`/`Set` for dynamic keys — O(1) lookups, clearer intent

## Async

- every `async` function must `await` something — remove `async` if synchronous
- no floating promises — always `await` or `void` every promise
- no `Promise` constructor wrapping an already-async operation
- `Promise.all()` for independent concurrent work over sequential `await` chains
