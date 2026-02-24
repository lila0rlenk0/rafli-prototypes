# Hooks

Custom React hooks for shared client-side logic.

## Naming Convention

ALWAYS: Name the return value of hooks descriptively at the call site
NEVER: Shadow built-in globals (e.g., `setTimeout`, `setInterval`, `fetch`)

```tsx
// BAD - shadows global setTimeout, unclear it auto-clears
const setTimeout = useTimeout();

// GOOD - self-explanatory, indicates safe/managed behavior
const setSafeTimeout = useTimeout();
```

The variable name must convey the hook's added value (auto-cleanup, debouncing, etc.) so any developer can understand the behavior without reading the hook source.
