'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { X_SHARE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { verifyXShare } from '@/services/raffle/verify-x-share';

import { getVerifyErrorMessage } from './verify-errors';

interface UseXVerifyParams {
	raffleId: string;
	publicSlug: string;
	/** Called before the verify call fires — lets the caller flip UI to "verifying". */
	onVerifyStart: () => void;
	/** Called after a hard failure to resolve the UI back to "idle" or "shared". */
	onVerifyFailure: (needsRestart: boolean) => void;
	/** Called after successful verification (ticket granted). */
	onVerified: () => void;
	/** Called when X hasn't indexed the tweet yet — consumer typically schedules auto-retry. */
	onNotFound: () => void;
}

interface TrackingContext {
	raffleId: string;
	publicSlug: string;
}

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
	// not-found restarts from scratch — expired is terminal (no re-share).
	const needsRestart = errorCode === 'core:xshare:not-found';
	onVerifyFailure(needsRestart);
	toast.error(getVerifyErrorMessage(errorCode));
}

/**
 * Handles the verified-success branch — toasts the grant, tracks the
 * success event, and returns control to the caller via `onVerified`.
 */
function handleVerifiedSuccess(
	ticketsGranted: number,
	context: TrackingContext,
	onVerified: () => void,
): void {
	track(X_SHARE_EVENTS.VERIFIED, {
		raffle_id: context.raffleId,
		raffle_slug: context.publicSlug,
		tickets_granted: ticketsGranted,
	});
	// Pluralize — grant count is usually 1 but can exceed it.
	const entryWord = ticketsGranted === 1 ? 'Bonus entry' : 'Bonus entries';
	toast.success(`${entryWord} granted! You're in the sweepstakes now.`);
	onVerified();
}

/**
 * Handles the "verify X post" half of the share flow.
 *
 * Calls `/verify-x-share`, narrows the response, and notifies the
 * orchestrator via transition callbacks. The orchestrator owns state
 * and auto-retry scheduling — this hook stays pure-transition.
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
		onVerified,
		onNotFound,
	} = params;
	const router = useRouter();

	const verify = useCallback(async () => {
		onVerifyStart();
		const result = await verifyXShare(raffleId);
		const context = { raffleId, publicSlug };

		if (!result.success) {
			// Cast — backend codes not enumerated in the narrow RaffleErrorCode union.
			handleFailure(result.error as string, context, onVerifyFailure);
			return;
		}
		if (result.data.status === 'verified') {
			handleVerifiedSuccess(result.data.ticketsGranted, context, onVerified);
			// Server action revalidated the cache tag — refresh paints RSC
			// with fresh ticket count and claim status.
			router.refresh();
			return;
		}
		// Tweet not found — track with reason so we can analyze whether
		// indexing latency or user error drives the miss rate.
		track(X_SHARE_EVENTS.VERIFICATION_FAILED, {
			raffle_id: raffleId,
			raffle_slug: publicSlug,
			error_code: 'not_found',
			reason: result.data.reason,
		});
		if (result.data.reason === 'not_found') {
			toast.info(
				"Your post hasn't been indexed by X yet — we'll automatically check again in a few seconds.",
			);
			onNotFound();
			return;
		}
		// Reason is null / unknown — no auto-retry, surface a generic error.
		toast.error('Verification failed. Please try again.');
		onVerifyFailure(false);
	}, [
		onNotFound,
		onVerified,
		onVerifyFailure,
		onVerifyStart,
		publicSlug,
		raffleId,
		router,
	]);

	return { verify };
}
