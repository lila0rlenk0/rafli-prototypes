import { formatCurrency } from '@/lib/utils/format/format-currency';
import type { MySubscription } from '@/types/subscription';

/**
 * Discriminated render-state for the navbar `<SubscriptionPill>`.
 *
 * Why a tagged union instead of a `{ isSubscribed, plan? }` shape:
 * the consumer renders either the "Subscribe" CTA or the tier label —
 * mutually exclusive content. Tagging on `kind` lets the JSX switch on
 * one discriminator and lets TypeScript narrow `planName` / `isHighlighted`
 * to the subscribed branch without optional chaining at every site.
 */
export type SubscriptionPillState =
	| { readonly kind: 'non-subscribed'; readonly balanceLabel: string }
	| {
			readonly kind: 'subscribed';
			readonly planName: string;
			readonly isHighlighted: boolean;
			readonly balanceLabel: string;
	  };

/**
 * Pure resolver for the navbar pill's render state.
 *
 * Why this is a pure helper rather than inline logic:
 * `useMySubscription`'s data is typed `MySubscription | null` but React Query
 * narrows that to `T | null | undefined` at the call site (undefined while
 * loading, undefined on transient query error). The previous inline check
 * `subscription !== null` returned `true` for `undefined`, then dereferenced
 * `subscription.plan` and crashed past the React tree. Collapsing both null
 * AND undefined into the non-subscribed branch — and unit-testing the
 * collapse — guarantees the component never sees an impossible state.
 *
 * Balance falls back to `$0` when `availableAmount` is `undefined` so a
 * still-loading credits query renders the design-spec "$0" rather than a
 * missing string. `availableAmount` arrives as a decimal *string* on the
 * wire (the backend returns `"30.00"` to dodge float drift on Stripe
 * cross-service hops); `formatCurrency` accepts both numeric and string
 * inputs, so we forward the string straight through and match every other
 * money surface in the app (whole dollars: `$30`; fractional: `$30.5`).
 *
 * @param subscription - User's current subscription, or `null`/`undefined`.
 * @param availableAmount - Credit balance as a decimal string, or `undefined` while loading.
 * @returns Discriminated render state for the pill.
 */
export function getSubscriptionPillState(
	subscription: MySubscription | null | undefined,
	availableAmount: string | undefined,
): SubscriptionPillState {
	const balanceLabel = formatCurrency(availableAmount ?? 0, 'USD');

	// Loose-equality null check is intentional — it folds `null` (no subscription)
	// and `undefined` (query loading/errored) into the same render path. The
	// alternative `=== null` only catches the first case and lets a `data`
	// of `undefined` slip through, which is exactly the bug this helper exists
	// to prevent.
	if (subscription == null) {
		return { kind: 'non-subscribed', balanceLabel };
	}

	return {
		kind: 'subscribed',
		planName: subscription.plan.name,
		isHighlighted: subscription.plan.metadata.isHighlighted,
		balanceLabel,
	};
}
