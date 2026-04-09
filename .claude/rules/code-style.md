# Code Style

Formatting (tabs, quotes, parens) enforced by Prettier.

## Scan Exclusions

`src/components/ui/` — shadcn stock, skip for eslint/TS audits and complexity scans

## JSX

- extract logic to named functions inside component scope, never inline in JSX
- ternary for conditionals, never `&&` — prevents rendering `0`/`""`, explicit null branch
- extract static JSX and RegExp to module scope — avoids re-creation per render

## Functions

- helpers inside component scope; exceptions: pure utilities in `@/lib/utils`, constants, shared helpers in same file
- decompose complex conditions into named helper functions
- extract inline callback/object types to named interfaces
- max ~50 SLOC per function, max 4 nesting levels
- one responsibility per function — if you need "and" to describe it, split
- `switch` exhaustiveness (`default: never`) over `if/else if` for unions
- replace boolean params with named options objects or separate functions

## Control Flow

- negate condition and return early, no deep `if/else` pyramids
- guard clauses at function top: validate, return/throw, then happy path
- no `else` after `return`/`throw`
- no nested ternaries — use `if/else` or named variable

## Naming

- descriptive hook return values, never shadow built-in globals
- delete unused imports, variables, functions, types — never comment out

## Type Safety

- no `any`, `unknown`, `as unknown as T`, `as never`, unsafe `as Type` casts
- no `@ts-ignore`, `@ts-expect-error`, `eslint-disable` — fix root cause
- prefer type guards (`is`, `in`, discriminated unions) over assertions
- narrow with control flow: `if (!x) throw` or `if ('kind' in x)`
- let TS infer return types internally; annotate public API boundaries

## Data

- `readonly` arrays/properties for immutable data
- destructure at call site, not deep inside function body
- no magic numbers/strings — named `const` with comment
- `Map`/`Set` for dynamic keys — O(1) lookups
- `.toSorted()`/`.toReversed()` not `.sort()`/`.reverse()` — immutability

## Async

- every `async` must `await` something — remove `async` if synchronous
- no floating promises — `await` or `void`
- no `Promise` constructor wrapping already-async operations
- `Promise.all()` for independent concurrent work
- no empty catch blocks — log or re-throw
