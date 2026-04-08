# Code Style

Non-linter conventions. Formatting (tabs, quotes, parens) is enforced by Prettier — not repeated here.

## JSX Logic Extraction

Never inline logic in JSX. Extract to named functions inside component scope.

```tsx
// bad — logic buried in JSX
<h2>{total > 0 ? `${total} Code${total !== 1 ? 's' : ''}` : 'Codes'}</h2>;

// good — named function
function getHeaderText(): string {
	if (total === 0) return 'Codes';
	return `${total} Code${total !== 1 ? 's' : ''}`;
}
<h2>{getHeaderText()}</h2>;
```

## Conditional Rendering

Use ternary for JSX conditionals — never `&&`. Prevents rendering `0` or `""` and makes the null branch explicit.

```tsx
// bad — && can render falsy primitives
{isLoading && <Spinner />}

// good — explicit null branch
{isLoading ? <Spinner /> : null}
```

## Early Return Pattern

Always negate the condition and return early.

```tsx
// bad
if (result.success) {
	/* happy path */
} else {
	toast.error('...');
}

// good
if (!result.success) {
	toast.error('...');
	return;
}
// happy path continues
```

## Function Placement

Prefer helpers inside component scope. Exceptions: pure utilities in `@/lib/utils`, constants, helpers shared by multiple components in the same file, hoisted static JSX and RegExp.

## Complex Logic Decomposition

Break complex conditions into named helper functions.

```tsx
// bad — dense predicate inline
const order = orders.find(o => o.status === STATUS.PENDING && o.raffleId === raffleId && ...);

// good — decomposed
function isReusable(order: Order, code?: string): boolean {
  return order.status === STATUS.PENDING && matchesRaffle(order) && hasCompatiblePromo(order, code);
}
const order = orders.find(o => isReusable(o, promoCode));
```

## Interface Extraction

Extract inline callback/object types to named interfaces.

## Hook Naming

Name hook return values descriptively. Never shadow built-in globals.

```tsx
// bad — shadows global setTimeout
const setTimeout = useTimeout();

// good — conveys added value
const setSafeTimeout = useTimeout();
```

## Immutable Array Operations

Use `.toSorted()` / `.toReversed()` instead of `.sort()` / `.reverse()` — mutating arrays breaks React's immutability model and causes stale closure bugs. Also applies to the `[...arr].sort()` spread-copy pattern.

```tsx
// bad — mutates original array
const sorted = users.sort((a, b) => a.name.localeCompare(b.name));

// bad — unnecessary spread, toSorted exists
const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));

// good — returns new array
const sorted = users.toSorted((a, b) => a.name.localeCompare(b.name));
```

## Hoist Static JSX and RegExp

Extract static JSX elements and RegExp literals to module scope — avoids re-creation on every render.

```tsx
// bad — recreates regex every render
function Validator() {
	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
}

// good — hoisted to module scope
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```
