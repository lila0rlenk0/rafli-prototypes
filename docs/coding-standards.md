# Coding Standards

## Error Handling Pattern

Always use early return with negated condition:

```tsx
// BAD
if (result.success) {
	// happy path
} else {
	toast.error('...');
}

// GOOD
if (!result.success) {
	toast.error('...');
	return;
}
// happy path continues
```

## JSX Logic Extraction

Never inline logic in JSX. Extract to named functions:

```tsx
// BAD
<h2>{total > 0 ? `${total} Code${total !== 1 ? 's' : ''}` : 'Codes'}</h2>
<div className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />

// GOOD
function getHeaderText(): string {
  if (total === 0) return 'Codes';
  return `${total} Code${total !== 1 ? 's' : ''}`;
}

function getIconClass(): string {
  const base = 'size-4';
  return isLoading ? `${base} animate-spin` : base;
}

<h2>{getHeaderText()}</h2>
<div className={getIconClass()} />
```

## Function Placement

All functions must be inside components. No top-level functions outside component scope:

```tsx
// BAD
function isValidStatus(status: Status): boolean {
	return VALID_STATUSES.includes(status);
}

export function MyComponent() {
	const isValid = isValidStatus(status);
}

// GOOD
export function MyComponent() {
	function isValidStatus(status: Status): boolean {
		return VALID_STATUSES.includes(status);
	}

	const isValid = isValidStatus(status);
}
```

Exception: Pure utility functions in `@/lib/utils`.

## Complex Logic Decomposition

Break complex conditions into named helper functions:

```tsx
// BAD
const order = orders.find(
	o =>
		o.status === STATUS.PENDING &&
		o.raffleId === raffleId &&
		(promoCode
			? o.promoCode === null || o.promoCode === promoCode
			: o.promoCode === null),
);

// GOOD
function matchesRaffle(order: Order): boolean {
	return order.raffleId === raffleId;
}

function hasCompatiblePromo(order: Order, code?: string): boolean {
	if (!code) return order.promoCode === null;
	return order.promoCode === null || order.promoCode === code;
}

function isReusable(order: Order, code?: string): boolean {
	return (
		order.status === STATUS.PENDING &&
		matchesRaffle(order) &&
		hasCompatiblePromo(order, code)
	);
}

const order = orders.find(o => isReusable(o, promoCode));
```

## Interface Extraction

Extract inline types to named interfaces:

```tsx
// BAD
interface Props {
	onCreate: (data: {
		count: number;
		type: PromoCodeType;
		value: number;
	}) => Promise<Result>;
}

// GOOD
export interface CreatePromoCodeData {
	count: number;
	type: PromoCodeType;
	value: number;
}

interface Props {
	onCreate: (data: CreatePromoCodeData) => Promise<Result>;
}
```
