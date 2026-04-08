---
paths:
  - 'src/**/*.tsx'
  - 'src/**/*.ts'
---

# React Effects

Avoid `useEffect`. Apply the correct replacement:

- Deriving state from state/props — inline computation or `useMemo`
- Fetching data — React Query hook wrapping a server action
- Responding to user actions — event handler
- One-time external sync on mount — `useEffect` with `[]` deps, comment `// mount: <reason>`
- Resetting state when a prop changes — `key` prop on parent component

## Smell tests

- `useEffect(() => setX(f(y)), [y])` — derived state, compute inline
- `useEffect(() => fetch(...).then(setX), [id])` — use React Query
- `useEffect(() => { if (flag) doAction(); setFlag(false); }, [flag])` — move to handler
- `useEffect(() => setX(null), [id])` — reset via `key` prop

## Legitimate `useEffect` (mount-only with `[]`)

- DOM integration (focus, scroll, IntersectionObserver)
- Browser API subscriptions (WebSocket, resize, keyboard)
- Third-party widget lifecycle (GSAP, Lexical commands)
- Cleanup timers/listeners on unmount

## Additional anti-patterns

- Notifying parent via effect — call parent callback in the same handler that changes state
- Chaining effects (state→effect→state→effect) — compute all next state in one handler
- Subscribing to external stores — use `useSyncExternalStore` instead of `useEffect` + `setState`
- `[...arr].sort()` in effects — derive sorted data inline with `.toSorted()`, no effect needed
