# Post-Implementation Verification

CRITICAL: Run these checks after EVERY implementation.

## Required: Lint

```bash
bun run lint
```

Must pass:
- No ESLint errors/warnings
- No unused variables/imports
- No React Hooks violations
- All imports resolve

## Checklist

**Code Quality:**
- [ ] `bun run lint` passes
- [ ] No unused code
- [ ] No `any` types
- [ ] JSDoc on functions
- [ ] Logic extracted from JSX

**React:**
- [ ] No setState in useEffect body
- [ ] Correct dependency arrays
- [ ] No infinite loops
- [ ] Runtime data in Suspense

**Runtime:**
- [ ] `bun run dev` has no errors
- [ ] Feature works manually

## Common Fixes

**Unused imports:**
```typescript
// Remove unused
import { useState, useEffect, useMemo } from 'react';
// Keep only used
import { useState } from 'react';
```

**Function order:**
```typescript
// BAD - used before declared in useState
const [v] = useState(() => calc());
function calc() { return 1; }

// GOOD - declare first
function calc() { return 1; }
const [v] = useState(() => calc());
```

**setState in useEffect:**
```typescript
// BAD
useEffect(() => {
  updateState(); // direct call
}, [updateState]);

// GOOD
useEffect(() => {
  const interval = setInterval(updateState, 1000);
  return () => clearInterval(interval);
}, [updateState]);
```

## Cleanup

**Playwright MCP screenshots:**
After completing tasks that used Playwright MCP for screenshots/browser testing, delete the generated folder:

```bash
rm -rf .playwright-mcp
```

ALWAYS: Clean up `.playwright-mcp` folder after visual debugging tasks are complete.

## Optional: Build

```bash
bun run build
```

Run before PRs or deployment.
