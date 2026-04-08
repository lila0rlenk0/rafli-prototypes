# ESLint

- Zero `eslint-disable` directives — no exceptions, no `eslint-disable-next-line`, no block disables
- Zero `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`
- If a rule fires, fix the code — never suppress the warning
- If the lint rule is genuinely wrong for a pattern, refactor to avoid triggering it
- Config: `eslint.config.mjs` — flat config, extends `next/core-web-vitals`, `next/typescript`, `prettier`
- Custom overrides: `no-unused-vars` and `no-explicit-any` both `error`

## Known config gaps (fix when touching `eslint.config.mjs`)

- `ban-ts-comment` defaults allow `@ts-expect-error` with description — override to ban all three
- `no-unused-expressions` downgraded to `warn` by `next/typescript` — override to `error`
- `reportUnusedDisableDirectives` is `warn` — set to `error` via `linterOptions`
- No `no-restricted-syntax` rule to ban direct `useEffect` calls
- Code style conventions (ternary not `&&`, `.toSorted()` not `.sort()`) have no lint enforcement

## Workaround for `react-hooks/exhaustive-deps` with optional chaining

Extract chained values to local variables before the hook — linter accepts simple identifiers:

```tsx
// bad — triggers exhaustive-deps
}, [session?.submitDeadline]);

// good — extract first
const submitDeadline = session?.submitDeadline;
// ... then use submitDeadline in deps array
}, [submitDeadline]);
```
