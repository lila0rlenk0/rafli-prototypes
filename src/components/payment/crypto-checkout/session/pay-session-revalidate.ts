import { getPaymentErrorMessage } from '@/lib/checkout/error-messages';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { CryptoCheckoutSession } from '@/types/wallet';

import type { HydratedCheckoutStep } from './session-guards';
import {
	getPaySessionRevalidationDecision,
	type PaySessionRevalidationDecision,
} from './session-guards';

/**
 * Shape of the authoritative server session returned by `getCryptoSession`.
 *
 * Kept local to the helper so the caller can pass the action's
 * `CryptoSessionResponse` directly without re-declaring the full type here —
 * only the fields the revalidation logic actually reads are required.
 */
export interface RevalidatedServerSession {
	status: Parameters<typeof getPaySessionRevalidationDecision>[0]['status'];
	submitDeadline: string;
	confirmDeadline: string;
	txHash: string | null;
	currency: string;
	failureReason?: string | null;
}

/**
 * Minimal signature of `getCryptoSession` so this helper stays server-action
 * agnostic and easy to unit test without any module mocks.
 */
export type GetCryptoSessionFn = (sessionId: string) => Promise<
	| {
			success: true;
			data: RevalidatedServerSession;
	  }
	| {
			success: false;
			error: PaymentErrorCode;
	  }
>;

/**
 * Discriminated outcome returned by `revalidateSessionBeforePay`.
 *
 * - `ok`: server confirms the session is still pending + within submit window,
 *   returns the refreshed server copy so the caller can sync local deadlines.
 * - `recoverable`: read failed transiently; caller should surface a toast and
 *   keep the user on the review step so they can retry the Pay action.
 * - `session-expired`: session is gone or permanently unrecoverable; caller
 *   should return the user to the wallet step with an expiry message.
 * - `rehydrate`: server advanced past pending (confirming/completed/failed);
 *   caller must hydrate from the refreshed server session into `nextStep`.
 */
export type RevalidateSessionOutcome =
	| { kind: 'ok'; refreshedSession: RevalidatedServerSession }
	| { kind: 'recoverable' }
	| { kind: 'session-expired'; message?: string }
	| {
			kind: 'rehydrate';
			refreshedSession: RevalidatedServerSession;
			nextStep: HydratedCheckoutStep;
	  };

/**
 * Re-reads backend session state immediately before any wallet broadcast.
 *
 * Review can sit open for minutes; the server owns whether this session is
 * still pending, already confirming, or terminal. Broadcasting based only on
 * a stale local review snapshot risks paying into a session the backend has
 * already cancelled or advanced.
 *
 * @param session - Current local crypto checkout session (for `id` lookup)
 * @param getCryptoSessionFn - Injected server action; keeps this helper pure
 * @returns Discriminated outcome describing the next checkout transition
 */
export async function revalidateSessionBeforePay(
	session: CryptoCheckoutSession,
	getCryptoSessionFn: GetCryptoSessionFn,
): Promise<RevalidateSessionOutcome> {
	const sessionResult = await getCryptoSessionFn(session.id);

	if (!sessionResult.success) {
		return classifyReadFailure(sessionResult.error);
	}

	const serverSession = sessionResult.data;
	const sendDecision = getPaySessionRevalidationDecision({
		status: serverSession.status,
		submitDeadline: serverSession.submitDeadline,
	});

	return mapDecisionToOutcome(sendDecision, serverSession);
}

/**
 * Classifies a failed `getCryptoSession` read into a terminal or recoverable
 * outcome. Only the three known-terminal payment codes force the user back
 * through the wallet step; everything else is treated as transport noise.
 *
 * @param errorCode - Payment error code from the failed session read
 * @returns Either `recoverable` (retryable) or `session-expired` (terminal)
 */
function classifyReadFailure(
	errorCode: PaymentErrorCode,
): RevalidateSessionOutcome {
	const isTerminal =
		errorCode === PAYMENT_ERROR_CODES.CRYPTO_SESSION_EXPIRED ||
		errorCode === PAYMENT_ERROR_CODES.CRYPTO_SESSION_NOT_FOUND ||
		errorCode === PAYMENT_ERROR_CODES.CRYPTO_ORDER_NOT_RECOVERABLE;

	if (!isTerminal) return { kind: 'recoverable' };

	return {
		kind: 'session-expired',
		message: getPaymentErrorMessage(errorCode),
	};
}

/**
 * Maps a `getPaySessionRevalidationDecision` result onto the outcome union.
 *
 * Split out to keep `revalidateSessionBeforePay` under the .ts complexity cap
 * and to make the state transitions easy to cover with unit tests.
 *
 * @param decision - Classification from the pure revalidation decision helper
 * @param refreshedSession - The server session the caller should persist
 * @returns Matching `RevalidateSessionOutcome` variant
 */
function mapDecisionToOutcome(
	decision: PaySessionRevalidationDecision,
	refreshedSession: RevalidatedServerSession,
): RevalidateSessionOutcome {
	if (decision.kind === 'session-expired') return { kind: 'session-expired' };

	if (decision.kind === 'rehydrate') {
		return {
			kind: 'rehydrate',
			refreshedSession,
			nextStep: decision.nextStep,
		};
	}

	return { kind: 'ok', refreshedSession };
}
