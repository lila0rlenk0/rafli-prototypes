import { describe, expect, test } from 'bun:test';

import { SUBSCRIPTION_PROVIDER } from '@/types/subscription';

import { pickSubscribeProvider } from './pick-subscribe-provider';

describe('pickSubscribeProvider', () => {
	test('returns the lock when the plan offers it', () => {
		// Returning Fanbasis buyer landing on a plan registered on both rails
		// must stay on Fanbasis — switching providers would split billing history.
		expect(
			pickSubscribeProvider({
				availableProviders: [
					SUBSCRIPTION_PROVIDER.STRIPE,
					SUBSCRIPTION_PROVIDER.FANBASIS,
				],
				lockedProvider: SUBSCRIPTION_PROVIDER.FANBASIS,
			}),
		).toBe(SUBSCRIPTION_PROVIDER.FANBASIS);
	});

	test('returns null when the lock is not in availableProviders', () => {
		// Fanbasis-locked buyer hitting a Stripe-only plan — the BE would
		// reject with `provider-locked`; the FE pre-empts the failure by
		// rendering an unavailable CTA.
		expect(
			pickSubscribeProvider({
				availableProviders: [SUBSCRIPTION_PROVIDER.STRIPE],
				lockedProvider: SUBSCRIPTION_PROVIDER.FANBASIS,
			}),
		).toBeNull();
	});

	test('prefers Stripe when no lock and both providers available', () => {
		// First-time buyer with both rails offered defaults to Stripe — older
		// rail with portal + in-place plan change. Comment preserved in helper.
		expect(
			pickSubscribeProvider({
				availableProviders: [
					SUBSCRIPTION_PROVIDER.STRIPE,
					SUBSCRIPTION_PROVIDER.FANBASIS,
				],
				lockedProvider: null,
			}),
		).toBe(SUBSCRIPTION_PROVIDER.STRIPE);
	});

	test('falls through to Fanbasis when no lock and Stripe absent', () => {
		// First-time buyer on a Fanbasis-only plan — BE guarantees the
		// array is non-empty, so the fall-through is safe.
		expect(
			pickSubscribeProvider({
				availableProviders: [SUBSCRIPTION_PROVIDER.FANBASIS],
				lockedProvider: null,
			}),
		).toBe(SUBSCRIPTION_PROVIDER.FANBASIS);
	});

	test('returns Stripe for a Stripe-only plan with no lock', () => {
		expect(
			pickSubscribeProvider({
				availableProviders: [SUBSCRIPTION_PROVIDER.STRIPE],
				lockedProvider: null,
			}),
		).toBe(SUBSCRIPTION_PROVIDER.STRIPE);
	});
});
