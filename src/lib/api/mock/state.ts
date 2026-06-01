import 'server-only';

import { cookies } from 'next/headers';

import type { SubscriptionStatus } from '@/types/subscription';

import {
	MOCK_STATE_COOKIE,
	MOCK_STATES,
	type MockState,
} from '@/types/mock-preview';

export type { MockState };

/** Default when no cookie is set — anonymous visitor, no subscription. */
export const DEFAULT_MOCK_STATE: MockState = 'guest';

/**
 * Type guard narrowing an arbitrary cookie string to a known `MockState`.
 *
 * @param value - Raw cookie value (or undefined)
 * @returns Whether the value is a recognised mock state
 */
function isMockState(value: string | undefined): value is MockState {
	return (
		value !== undefined && (MOCK_STATES as readonly string[]).includes(value)
	);
}

/**
 * Reads the current mock state from the request cookies.
 *
 * Wrapped in try/catch because `cookies()` throws inside a `'use cache'`
 * scope — callers on the cached public path simply get the `guest` default,
 * which is correct (those endpoints never branch on auth).
 *
 * @returns The active mock state, or `guest` when unset / unavailable
 */
export async function readMockState(): Promise<MockState> {
	try {
		const store = await cookies();
		const value = store.get(MOCK_STATE_COOKIE)?.value;
		return isMockState(value) ? value : DEFAULT_MOCK_STATE;
	} catch {
		return DEFAULT_MOCK_STATE;
	}
}

/**
 * Whether a mock state represents a signed-in user.
 *
 * @param state - The mock state to test
 * @returns True for every state except `guest`
 */
export function isAuthedState(state: MockState): boolean {
	return state !== 'guest';
}

/**
 * Maps a mock state to the subscription status the `/me/subscription` envelope
 * should report. `guest` and `none` have no subscription entity (null).
 *
 * @param state - The mock state to translate
 * @returns A subscription status, or null when there is no subscription
 */
export function subscriptionStatusForState(
	state: MockState,
): SubscriptionStatus | null {
	switch (state) {
		case 'active':
			return 'active';
		case 'past_due':
			return 'past_due';
		case 'cancelled':
			return 'cancelled';
		case 'expired':
			return 'expired';
		default:
			return null;
	}
}
