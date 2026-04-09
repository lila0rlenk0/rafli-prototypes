# ESLint

- zero `eslint-disable` directives — no exceptions
- zero `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`
- fix the code, never suppress. if rule is wrong, refactor to avoid triggering
- config: `eslint.config.mjs` — flat config, extends `next/core-web-vitals`, `next/typescript`, `prettier`
- custom overrides: `no-unused-vars` and `no-explicit-any` both `error`

## Config Gaps

fix when touching `eslint.config.mjs`:
- `ban-ts-comment` allows `@ts-expect-error` with description — override to ban all three
- `no-unused-expressions` downgraded to `warn` — override to `error`
- `reportUnusedDisableDirectives` is `warn` — set to `error`
- no `no-restricted-syntax` to ban direct `useEffect` calls

## exhaustive-deps with Optional Chaining

extract chained values to local variables — linter accepts simple identifiers:

```tsx
const submitDeadline = session?.submitDeadline;
// use submitDeadline in deps, not session?.submitDeadline
```
