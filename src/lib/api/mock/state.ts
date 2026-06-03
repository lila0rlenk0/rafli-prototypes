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

/** Subscription tier a mock state simulates — drives which plan the envelope embeds. */
export type MockSubscriptionTier = 'basic' | 'starter' | 'pro';

/**
 * The subscription + credit shape each mock state simulates. One row per state
 * is the single source of truth the `/me/subscription` and `/me/credits`
 * resolvers read, so the preview tier + balance can never drift apart.
 *
 * `creditAmount` is a decimal string (1 credit = $1 = 1 entry). The
 * `*_credits` states carry a balance; everything else is broke.
 */
interface MockSubscriptionProfile {
	readonly status: SubscriptionStatus | null;
	readonly tier: MockSubscriptionTier | null;
	readonly creditAmount: string;
}

// Balance handed to the "has credits" preview states — 12 credits = 12 entries.
const MOCK_CREDIT_BALANCE = '12.0000';
const MOCK_NO_CREDITS = '0.0000';

const MOCK_STATE_PROFILES: Readonly<
	Record<MockState, MockSubscriptionProfile>
> = {
	guest: { status: null, tier: null, creditAmount: MOCK_NO_CREDITS },
	none: { status: null, tier: null, creditAmount: MOCK_NO_CREDITS },
	basic_credits: {
		status: 'active',
		tier: 'basic',
		creditAmount: MOCK_CREDIT_BALANCE,
	},
	basic_no_credits: {
		status: 'active',
		tier: 'basic',
		creditAmount: MOCK_NO_CREDITS,
	},
	starter_no_credits: {
		status: 'active',
		tier: 'starter',
		creditAmount: MOCK_NO_CREDITS,
	},
	pro_credits: {
		status: 'active',
		tier: 'pro',
		creditAmount: MOCK_CREDIT_BALANCE,
	},
	pro_no_credits: {
		status: 'active',
		tier: 'pro',
		creditAmount: MOCK_NO_CREDITS,
	},
	past_due: { status: 'past_due', tier: 'pro', creditAmount: MOCK_NO_CREDITS },
};

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
	return MOCK_STATE_PROFILES[state].status;
}

/**
 * Maps a mock state to the subscription tier whose plan the envelope embeds.
 *
 * @param state - The mock state to translate
 * @returns The tier, or null when there is no subscription
 */
export function subscriptionTierForState(
	state: MockState,
): MockSubscriptionTier | null {
	return MOCK_STATE_PROFILES[state].tier;
}

/**
 * Maps a mock state to the credit balance the `/me/credits` envelope reports.
 *
 * @param state - The mock state to translate
 * @returns A decimal credit amount string
 */
export function creditAmountForState(state: MockState): string {
	return MOCK_STATE_PROFILES[state].creditAmount;
}

/**
 * Whether a mock state grants live subscription access — i.e. the hub should
 * render its unlocked (subscribed) surface rather than the locked guest one.
 * True for any state with a subscription entity except `expired`, where the
 * subscription has lapsed and access is revoked. `guest`/`none` are locked.
 *
 * @param state - The mock state to test
 * @returns True when the user currently has subscription access
 */
export function hasSubscriptionAccess(state: MockState): boolean {
	const status = subscriptionStatusForState(state);
	return status !== null && status !== 'expired';
}
