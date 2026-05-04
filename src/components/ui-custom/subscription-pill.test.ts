import { describe, expect, test } from 'bun:test';

import type { MySubscription } from '@/types/subscription';

import { getSubscriptionPillState } from './subscription-pill.helpers';

// Fixtures hoisted to module scope so each test case stays focused on the
// assertion, and so a future schema tweak only needs editing in one place.
// Both plans share the boilerplate envelope — `isHighlighted` is the single
// switch driving the yellow vs white treatment in the consumer. Plain object
// literals (no `as const`) keep the inferred type assignable to the Zod-
// derived `MySubscription` shape — readonly tuples can't widen to mutable
// arrays.
const STARTER_SUBSCRIPTION: MySubscription = {
	id: '01999999-9999-7999-8999-999999999999',
	plan: {
		id: '01999999-9999-7999-8999-999999999998',
		name: 'Starter',
		monthlyPriceAmount: '30.00',
		creditAmount: '30.00',
		discountPercent: 10,
		metadata: {
			badgeText: null,
			highlightLabel: null,
			isHighlighted: false,
			sortOrder: 0,
			tagline: 'Starter',
			features: [],
		},
	},
	status: 'active',
	currentPeriodEnd: '2099-01-01T00:00:00Z',
	cancelledAt: null,
};

const PRO_SUBSCRIPTION: MySubscription = {
	id: '01999999-9999-7999-8999-999999999997',
	plan: {
		id: '01999999-9999-7999-8999-999999999996',
		name: 'Pro',
		monthlyPriceAmount: '60.00',
		creditAmount: '60.00',
		discountPercent: 20,
		metadata: {
			badgeText: null,
			highlightLabel: null,
			isHighlighted: true,
			sortOrder: 1,
			tagline: 'Pro',
			features: [],
		},
	},
	status: 'active',
	currentPeriodEnd: '2099-01-01T00:00:00Z',
	cancelledAt: null,
};

describe('getSubscriptionPillState', () => {
	describe('subscription absent', () => {
		test('returns non-subscribed state when subscription is null', () => {
			const state = getSubscriptionPillState(null, '0');
			expect(state.kind).toBe('non-subscribed');
		});

		// Regression: useQuery types `data` as `T | undefined` even when the
		// hook generic is `MySubscription | null`. The previous inline check
		// `subscription !== null` returned true for `undefined`, then dereferenced
		// `subscription.plan` and crashed. The helper must collapse both
		// "loading-finished-with-error" (undefined) and "fetched-no-sub" (null)
		// into the same non-subscribed render so a transient query error never
		// throws past the React tree.
		test('returns non-subscribed state when subscription is undefined', () => {
			const state = getSubscriptionPillState(undefined, '0');
			expect(state.kind).toBe('non-subscribed');
		});
	});

	describe('subscription present', () => {
		test('returns subscribed state with the plan name', () => {
			const state = getSubscriptionPillState(STARTER_SUBSCRIPTION, '30');
			expect(state).toEqual({
				kind: 'subscribed',
				planName: 'Starter',
				isHighlighted: false,
				balanceLabel: '$30',
			});
		});

		test('flags isHighlighted=true for the featured plan', () => {
			const state = getSubscriptionPillState(PRO_SUBSCRIPTION, '60');
			expect(state.kind).toBe('subscribed');
			if (state.kind === 'subscribed') {
				expect(state.isHighlighted).toBe(true);
				expect(state.planName).toBe('Pro');
			}
		});
	});

	describe('balance formatting', () => {
		test('formats undefined credit as $0 — used while the credits query is loading', () => {
			const state = getSubscriptionPillState(null, undefined);
			expect(state.balanceLabel).toBe('$0');
		});

		test('formats whole-dollar credit without trailing decimals', () => {
			const state = getSubscriptionPillState(null, '30');
			expect(state.balanceLabel).toBe('$30');
		});

		test('renders fractional credit without forcing trailing zeros', () => {
			// formatCurrency leaves `minimumFractionDigits: 0` so $30.5 renders
			// as "$30.5" — matches every other money surface in the app rather
			// than introducing a one-off pad here.
			const state = getSubscriptionPillState(null, '30.5');
			expect(state.balanceLabel).toBe('$30.5');
		});
	});
});
