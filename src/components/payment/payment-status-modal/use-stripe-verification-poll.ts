'use client';

import { useEffect, useRef, useState } from 'react';

import { resolveStripeVerificationState, type VerifiedStatus } from './state';
import { useStripeSessionStatusPoll } from '@/services/payment/use-stripe-session-status-poll';
import type { PaymentErrorCode } from '@/types/errors';

/**
 * How often we re-ask the server whether Stripe has finalized the
 * session. Stripe usually redirects before our webhook persists
 * `completed`, so the first poll can still observe "unpaid".
 */
const STRIPE_STATUS_POLL_INTERVAL_MS = 3_000;

/**
 * Safety net: 40 polls × 3s = ~120s — long enough for any legitimate
 * webhook delay, short enough that users aren't stuck in a spinner
 * forever. After this limit the hook transitions to
 * `verification-failed` with a manual retry button.
 */
const MAX_STRIPE_POLL_ATTEMPTS = 40;

interface UseStripeVerificationPollOptions {
	open: boolean;
	stripeSessionId: string;
}

interface UseStripeVerificationPollResult {
	status: VerifiedStatus;
	verificationError: PaymentErrorCode | null;
	retryVerification: () => void;
	/**
	 * Order id captured from the last successful Stripe status poll. Null
	 * while the loop is still polling or after a verification failure; the
	 * paid-state celebration needs this to fetch the order's
	 * `ticketQuantity` for the tier-keyed body.
	 */
	orderId: string | null;
}

/**
 * Owns the Stripe-session verification poll loop. Separated from the
 * modal so the UI component stays focused on rendering and the polling
 * contract stays independently testable.
 *
 * @returns Current verification status, last error code, and a retry callback.
 */
export function useStripeVerificationPoll({
	open,
	stripeSessionId,
}: UseStripeVerificationPollOptions): UseStripeVerificationPollResult {
	const [status, setStatus] = useState<VerifiedStatus>('loading');
	const [verificationError, setVerificationError] =
		useState<PaymentErrorCode | null>(null);
	const [orderId, setOrderId] = useState<string | null>(null);
	// Manual-retry trigger — incremented by `retryVerification` to re-run
	// the effect without re-opening the modal.
	const [verificationAttempt, setVerificationAttempt] = useState(0);
	// Poll counter tracked in a ref so repeated recursive ticks don't
	// cause a re-render on every increment.
	const pollCountRef = useRef(0);

	const pollStatus = useStripeSessionStatusPoll();

	// Sync: open/stripeSessionId/verificationAttempt. Cancels in-flight
	// fetches + clears the timer on cleanup to prevent leaked state
	// updates. Capped at MAX_STRIPE_POLL_ATTEMPTS so a permanently lost
	// webhook doesn't spin forever.
	useEffect(() => {
		if (!open) return;

		let cancelled = false;
		let timerId: ReturnType<typeof globalThis.setTimeout> | null = null;
		pollCountRef.current = 0;

		async function verifyStatus() {
			pollCountRef.current += 1;

			const result = await pollStatus(stripeSessionId);
			const decision = resolveStripeVerificationState(result);
			if (cancelled) return;

			setStatus(decision.status);
			setVerificationError(decision.errorCode);
			if (result.success) {
				setOrderId(result.data.orderId);
			}

			if (!decision.shouldPoll) return;

			if (pollCountRef.current >= MAX_STRIPE_POLL_ATTEMPTS) {
				setStatus('verification-failed');
				return;
			}

			timerId = globalThis.setTimeout(() => {
				void verifyStatus();
			}, STRIPE_STATUS_POLL_INTERVAL_MS);
		}

		void verifyStatus();

		return function cleanup() {
			cancelled = true;
			if (timerId !== null) {
				globalThis.clearTimeout(timerId);
			}
		};
	}, [open, stripeSessionId, verificationAttempt, pollStatus]);

	function retryVerification() {
		// User-driven rather than auto-loop — avoids mislabeling permanent
		// failures as "still processing" on the UI.
		setStatus('loading');
		setVerificationError(null);
		setVerificationAttempt(prev => prev + 1);
	}

	return { status, verificationError, retryVerification, orderId };
}
