---
paths:
  - 'src/**/*.tsx'
  - 'src/**/*.ts'
---

# React Effects

Avoid `useEffect`. Correct replacements:

- deriving state from state/props — inline computation or `useMemo`
- fetching data — React Query hook wrapping server action
- responding to user actions — event handler
- one-time external sync on mount — `useEffect` with `[]` deps, comment `// mount: <reason>`
- resetting state when prop changes — `key` prop on parent

## Smells

- `useEffect(() => setX(f(y)), [y])` — derived state, compute inline
- `useEffect(() => fetch(...), [id])` — use React Query
- `useEffect(() => { if (flag) doAction(); setFlag(false); }, [flag])` — move to handler
- `useEffect(() => setX(null), [id])` — reset via `key`

## Legitimate (mount-only `[]`)

DOM integration, browser API subscriptions, third-party widget lifecycle, cleanup on unmount

## Anti-patterns

- notifying parent via effect — call callback in the handler that changes state
- chaining effects — compute all next state in one handler
- subscribing to external stores — `useSyncExternalStore`
