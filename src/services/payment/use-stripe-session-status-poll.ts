'use client';

import { useCallback } from 'react';

import { getStripeSessionStatus } from '@/services/payment/get-stripe-session-status';

/**
 * Returns a stable callback that requests the current Stripe checkout
 * session status. Wrapping the action in a hook lets callers invoke the
 * fetch from inside `useEffect` without importing `@/services/*` directly
 * — `local/no-useeffect-data-fetch` (data-fetching.md) bans that.
 *
 * @returns A callback that resolves to the server-action `ServiceResponse`
 */
export function useStripeSessionStatusPoll() {
	return useCallback(function pollStripeSessionStatus(stripeSessionId: string) {
		return getStripeSessionStatus(stripeSessionId);
	}, []);
}
