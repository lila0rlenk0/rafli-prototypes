# Components Layer

UI components organized by domain. Server Components first architecture.

## Directory Structure

```
components/
├── ui/       # Base primitives (Button, Input, Card)
├── auth/     # Authentication flows
├── raffle/   # Raffle display and interaction
├── host/     # Host profiles and management
├── payment/  # Checkout and payment UI
├── filters/  # Search and filtering
└── mode/     # User mode switching
```

## Golden Rules

CRITICAL: Server Components by default
CRITICAL: Wrap runtime data access in Suspense
ALWAYS: Extract logic from JSX into named functions
ALWAYS: Use `function` declarations, not arrow functions
ALWAYS: JSDoc on all components and exported functions
ALWAYS: Import directly from component files (e.g., `@/components/host/host-profile-card`)
NEVER: `'use client'` without interactivity requirement
NEVER: Create barrel exports (index.ts) in component folders

## Conventions

**Server Components** - Static content, data fetching, SEO-critical, no browser APIs
**Client Components** - Interactive UI, React hooks, browser APIs, mark with `'use client'`

## How To: Layout with Runtime Data (CRITICAL)

Runtime data (`cookies()`, `headers()`, `searchParams`, `getSession()`) blocks streaming. Extract and wrap in Suspense.

```tsx
// BAD - blocks entire route tree
export default async function Layout({ children }) {
	const session = await getSession(); // cookies() inside
	return <Nav user={session.user}>{children}</Nav>;
}

// GOOD - enables streaming
async function LayoutContent({ children }) {
	const session = await getSession();
	return <Nav user={session.user}>{children}</Nav>;
}

export default function Layout({ children }) {
	return (
		<Suspense fallback={<Spinner />}>
			<LayoutContent>{children}</LayoutContent>
		</Suspense>
	);
}
```

## How To: Extract Logic with JSDoc

Keep JSX clean. Define helpers inside component with JSDoc.

```tsx
export function UserCard({ user, count }: Props) {
  /**
   * Gets display name for user
   * @param user - User object
   * @returns Display name string
   */
  function getDisplayName(user: User): string {
    return user.name || user.email;
  }

  function formatCount(count: number): string {
    return count.toLocaleString();
  }

  return (
    <div>{getDisplayName(user)}</div>
    <div>{formatCount(count)}</div>
  );
}
```

## How To: Function Style

```tsx
// BAD - arrow functions
const handleClick = () => { ... };
const formatValue = (v: number) => v.toLocaleString();

// GOOD - function declarations
function handleClick() { ... }
function formatValue(v: number) { return v.toLocaleString(); }

// Arrow functions ONLY in hooks:
const memoizedFn = useCallback(() => { ... }, []);
const computed = useMemo(() => expensive(data), [data]);
```

## How To: Loading States

**Page-level** - Create `loading.tsx` sibling to `page.tsx`:

```tsx
// app/raffles/loading.tsx
export default function Loading() {
	return <PageSkeleton />;
}
```

**Component-level** - Wrap async children in Suspense:

```tsx
<Suspense fallback={<Skeleton />}>
	<AsyncComponent />
</Suspense>
```

## How To: Conditional Rendering

Extract complex conditions into named helper functions. Avoid nested ternaries in JSX.

```tsx
// BAD - nested ternaries, hard to read
{showWonCard && myWinning ? (
  <WonCard />
) : isOwner && isConcluded && hasWinners ? (
  <HostCard />
) : showNotWon ? (
  <NotWonCard />
) : (
  <ActiveCard />
)}

// GOOD - helper functions with clear intent
function shouldShowWinnerCard(): boolean {
  return isConcluded && didUserWin && !!myWinning;
}

function shouldShowHostFulfillment(): boolean {
  return isOwner && isConcluded && hasWinners && !didUserWin;
}

function shouldShowNotWonCard(): boolean {
  return isConcluded && !didUserWin && !isOwner;
}

function shouldShowActiveCard(): boolean {
  return !isConcluded;
}

// In JSX - flat, readable
{shouldShowWinnerCard() && <WonCard />}
{shouldShowHostFulfillment() && <HostCard />}
{shouldShowNotWonCard() && <NotWonCard />}
{shouldShowActiveCard() && <ActiveCard />}
```

## Performance

- `useMemo` for expensive calculations
- `useCallback` for callback stability
- Debounce frequent events (scroll, input)
- Use `next/image` for images
- Use `next/dynamic` for heavy client components
- Avoid prop drilling - prefer composition
