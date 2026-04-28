'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

import { X_SHARE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { verifyXShare } from '@/services/raffle/verify-x-share';

import {
	getPendingReviewMessage,
	getVerifyErrorMessage,
} from './verify-errors';

/**
 * Lax-review deferred payload from `verifyXShare`. Mirrors the
 * `pending_review` branch of the service's discriminated union — kept as a
 * named type so the shape is declared once across the callback contract,
 * the handler signature, and the call site.
 */
interface LaxReviewDeferredInfo {
	/** Lax retries left before the backend's blind-grant fallback. */
	attemptsRemaining: number;
	/** Server-enforced cooldown until the next verify call is accepted. */
	retryAfterSeconds: number;
}

interface UseXVerifyParams {
	raffleId: string;
	publicSlug: string;
	/** Called before the verify call fires — lets the caller flip UI to "verifying". */
	onVerifyStart: () => void;
	/** Called after a hard failure to resolve the UI back to "idle" or "shared". */
	onVerifyFailure: (needsRestart: boolean) => void;
	/**
	 * Called when the backend defers the grant pending X index catch-up
	 * (`pending_review`). The orchestrator should keep the verify CTA visible so
	 * the user can retry once `retryAfterSeconds` has elapsed — this is NOT a
	 * failure path, so don't surface it through `onVerifyFailure`.
	 */
	onVerifyDeferred: (info: LaxReviewDeferredInfo) => void;
	/** Called after successful verification (ticket granted). */
	onVerified: (ticketsGranted: number) => void;
}

interface TrackingContext {
	raffleId: string;
	publicSlug: string;
}

/**
 * Backend error codes that invalidate the existing pending claim. The user
 * must re-share to refresh the row before another verify can succeed —
 * the orchestrator resets to `idle` so the share CTA reappears.
 *
 *  - `core:xshare:not-found` — claim row missing (e.g. user cleared cookies)
 *  - `core:xshare:expired`   — pending claim past its `expiresAt`; backend
 *    rejects lazily, so re-running `createXShareIntent` is required to
 *    refresh `token`/`expiresAt` on the same row.
 */
const RESTART_ERROR_CODES = new Set<string>([
	'core:xshare:not-found',
	'core:xshare:expired',
]);

/**
 * Handles a verify failure branch — toasts the mapped message and
 * reports whether the orchestrator should reset to idle.
 */
function handleFailure(
	errorCode: string,
	context: TrackingContext,
	onVerifyFailure: (needsRestart: boolean) => void,
): void {
	track(X_SHARE_EVENTS.VERIFICATION_FAILED, {
		raffle_id: context.raffleId,
		raffle_slug: context.publicSlug,
		error_code: errorCode,
	});
	onVerifyFailure(RESTART_ERROR_CODES.has(errorCode));
	toast.error(getVerifyErrorMessage(errorCode));
}

/**
 * Handles the verified-success branch — toasts the grant, tracks the
 * success event, and returns control to the caller via `onVerified`.
 */
function handleVerifiedSuccess(
	ticketsGranted: number,
	context: TrackingContext,
	onVerified: (ticketsGranted: number) => void,
): void {
	track(X_SHARE_EVENTS.VERIFIED, {
		raffle_id: context.raffleId,
		raffle_slug: context.publicSlug,
		tickets_granted: ticketsGranted,
	});
	// Pluralize — grant count is usually 1 but the wording stays robust if
	// backend ever bumps it for a campaign.
	const entryWord = ticketsGranted === 1 ? 'Bonus entry' : 'Bonus entries';
	toast.success(`${entryWord} granted! You're in the sweepstakes now.`);
	onVerified(ticketsGranted);
}

/**
 * Handles the lax-review deferred branch — backend hasn't found the tweet in X's
 * recent-search index yet (~30–120s lag) and asks the user to retry. Tracks as
 * a distinct event so the failure funnel stays clean, surfaces an informative
 * (non-error) toast with the remaining retry budget, and lets the orchestrator
 * keep the verify CTA visible for the next attempt.
 */
function handleVerifyDeferred(
	info: LaxReviewDeferredInfo,
	context: TrackingContext,
	onVerifyDeferred: UseXVerifyParams['onVerifyDeferred'],
): void {
	track(X_SHARE_EVENTS.VERIFICATION_DEFERRED, {
		attempts_remaining: info.attemptsRemaining,
		raffle_id: context.raffleId,
		raffle_slug: context.publicSlug,
		retry_after_seconds: info.retryAfterSeconds,
	});
	toast.info(
		getPendingReviewMessage(info.attemptsRemaining, info.retryAfterSeconds),
	);
	onVerifyDeferred(info);
}

/**
 * Handles the "verify X post" half of the share flow.
 *
 * Backend runs a best-effort X search and applies the lax-review matrix
 * (found / unavailable / not_found-with-budget / not_found-exhausted). The
 * `pending_review` outcome is non-terminal — X's index hasn't picked up the
 * tweet yet — and must NOT be surfaced as a failure or it'd contradict the
 * lax invariant. UNIQUE(raffleId, userId) on the backend caps abuse, so the
 * hook can stay tolerant on the user-facing path.
 *
 * @param params - Raffle identifiers plus transition callbacks.
 * @returns A stable `verify` function ready to bind to a button handler.
 */
export function useXVerify(params: UseXVerifyParams): {
	verify: () => Promise<void>;
} {
	const {
		raffleId,
		publicSlug,
		onVerifyStart,
		onVerifyFailure,
		onVerifyDeferred,
		onVerified,
	} = params;

	const verify = useCallback(async () => {
		onVerifyStart();
		const result = await verifyXShare(raffleId);
		const context = { raffleId, publicSlug };

		if (!result.success) {
			handleFailure(result.error, context, onVerifyFailure);
			return;
		}
		// Discriminated union from the service: lax-deferred is NOT a failure.
		if (result.data.status === 'pending_review') {
			handleVerifyDeferred(
				{
					attemptsRemaining: result.data.attemptsRemaining,
					retryAfterSeconds: result.data.retryAfterSeconds,
				},
				context,
				onVerifyDeferred,
			);
			return;
		}
		handleVerifiedSuccess(result.data.ticketsGranted, context, onVerified);
	}, [
		onVerified,
		onVerifyDeferred,
		onVerifyFailure,
		onVerifyStart,
		publicSlug,
		raffleId,
	]);

	return { verify };
}
