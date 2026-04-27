'use client';

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
 * Handles the "verify X post" half of the share flow.
 *
 * Backend grants the ticket on the success path regardless of whether the
 * tweet was found by X search (UNIQUE(raffleId, userId) caps abuse), so
 * there is no longer a `not_found` outcome to auto-retry on. The hook just
 * narrows the response, surfaces toasts, and notifies the orchestrator.
 *
 * @param params - Raffle identifiers plus transition callbacks.
 * @returns A stable `verify` function ready to bind to a button handler.
 */
export function useXVerify(params: UseXVerifyParams): {
	verify: () => Promise<void>;
} {
	const { raffleId, publicSlug, onVerifyStart, onVerifyFailure, onVerified } =
		params;

	const verify = useCallback(async () => {
		onVerifyStart();
		const result = await verifyXShare(raffleId);
		const context = { raffleId, publicSlug };

		if (!result.success) {
			handleFailure(result.error, context, onVerifyFailure);
			return;
		}
		handleVerifiedSuccess(result.data.ticketsGranted, context, onVerified);
	}, [onVerified, onVerifyFailure, onVerifyStart, publicSlug, raffleId]);

	return { verify };
}
