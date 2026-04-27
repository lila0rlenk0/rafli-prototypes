'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { usePollMyTicketCodes } from '@/services/ticket/use-poll-my-ticket-codes';

import { useXIntent } from './use-intent';
import { useXVerify } from './use-verify';

type XShareState = 'idle' | 'loading' | 'shared' | 'verifying' | 'verified';

/** Props needed by both ShareOnXButton and StickyBuyTicketsCta. */
export interface XShareConfig {
	raffleId: string;
	title: string;
	publicSlug: string;
	xShareEnabled: boolean;
	/**
	 * Backend claim status — `'verified'` is terminal (one bonus ticket per
	 * user per raffle, lifetime). `'pending'` resumes the verify CTA after a
	 * mid-flow refresh. `null` when the user has not started a tokenized
	 * share yet.
	 */
	xShareClaimStatus?: 'pending' | 'verified' | null;
	/** When set, user must answer the quiz correctly before sharing (same gate as purchase flow) */
	questionId?: string | null;
	/** Server-rendered ticket total before this share attempt — enables async issuance polling. */
	myTicketsTotal?: number;
}

interface UseXShareResult {
	state: XShareState;
	/** True when the user already earned their bonus entry for this sweepstakes */
	alreadyVerified: boolean;
	/** True when the claim is terminal (verified) — no re-share allowed */
	claimUsed: boolean;
	/** Raw claim status for per-status UI messaging */
	xShareClaimStatus?: 'pending' | 'verified' | null;
	handleShare: () => void | Promise<void>;
	handleVerify: () => Promise<void>;
}

/**
 * Strips the xref token from the URL after mount. The token is only
 * meaningful to backend verification — leaving it in the address bar
 * is noisy and could leak the claim token if the user copies the link.
 */
function useStripXrefToken(): void {
	useEffect(() => {
		const url = new URL(window.location.href);
		if (!url.searchParams.has('xref')) return;
		url.searchParams.delete('xref');
		window.history.replaceState(null, '', url.pathname + (url.search || ''));
	}, []);
}

/**
 * Waits for ticket-code issuance to catch up after verify succeeds, then
 * refreshes RSC once the "My Tickets" source of truth can show the new entry.
 */
function useXShareTicketSync(params: {
	raffleId: string;
	myTicketsTotal?: number;
}): (ticketsGranted: number) => void {
	const { raffleId, myTicketsTotal } = params;
	const router = useRouter();
	const [ticketSyncTarget, setTicketSyncTarget] = useState<number | null>(null);
	const resolvedTicketSyncTarget = useRef<number | null>(null);
	const { isExpired, isSynced } = usePollMyTicketCodes(
		ticketSyncTarget !== null ? raffleId : null,
		ticketSyncTarget,
	);

	useEffect(() => {
		const didSyncSettle = isSynced || isExpired;
		if (ticketSyncTarget === null || !didSyncSettle) return;
		if (resolvedTicketSyncTarget.current === ticketSyncTarget) return;

		resolvedTicketSyncTarget.current = ticketSyncTarget;

		queueMicrotask(() => {
			setTicketSyncTarget(current =>
				current === ticketSyncTarget ? null : current,
			);
			router.refresh();
		});
	}, [isSynced, isExpired, router, ticketSyncTarget]);

	return useCallback(
		(ticketsGranted: number) => {
			resolvedTicketSyncTarget.current = null;

			if (myTicketsTotal === undefined) {
				router.refresh();
				return;
			}

			// X-share verification commits the claim before ticket-ledger code
			// generation finishes, so wait for the same endpoint the UI renders.
			setTicketSyncTarget(myTicketsTotal + ticketsGranted);
		},
		[myTicketsTotal, router],
	);
}

/**
 * Shared hook for X share → verify → free ticket flow.
 *
 * Two sub-concerns:
 *  1. Intent creation (`use-intent`) — plain or tokenized share.
 *  2. Verify + transitions (`use-verify`) — claim the bonus entry.
 *
 * The previous auto-retry timer existed to paper over X-search index lag
 * (the backend used to return `not_found` and we'd poll until the tweet
 * was indexed). Backend now grants on the first verify call regardless of
 * whether the tweet is found, so the loop is gone.
 *
 * @param config - Raffle identifiers + claim status + share gate flag.
 * @returns `{ state, alreadyVerified, claimUsed, xShareClaimStatus,
 *   handleShare, handleVerify }`.
 */
export function useXShare({
	raffleId,
	title,
	publicSlug,
	xShareEnabled,
	xShareClaimStatus,
	myTicketsTotal,
}: XShareConfig): UseXShareResult {
	// Backend collapsed the status enum to `pending | verified`; verified is
	// the only terminal state and means the bonus ticket was already granted.
	const alreadyVerified = xShareClaimStatus === 'verified';
	// Resume the verify CTA if the user has a pending claim from a prior
	// session (they shared but navigated away before verifying).
	const [state, setState] = useState<XShareState>(
		xShareClaimStatus === 'pending' ? 'shared' : 'idle',
	);
	const claimUsed = alreadyVerified || state === 'verified';

	useStripXrefToken();
	const syncTickets = useXShareTicketSync({ raffleId, myTicketsTotal });

	const useTokenizedFlow = xShareEnabled && !claimUsed;

	const { triggerPlainShare, triggerTokenizedShare } = useXIntent({
		raffleId,
		title,
		publicSlug,
		onLoading: loading => setState(loading ? 'loading' : 'idle'),
		onSharePrepared: () => setState('shared'),
	});

	const { verify } = useXVerify({
		raffleId,
		publicSlug,
		onVerifyStart: () => setState('verifying'),
		// `needsRestart` collapses to `'idle'` so the share CTA reappears
		// (e.g. backend rejected an expired pending claim — re-share to
		// refresh the row). Otherwise stay on `'shared'` for a manual retry.
		onVerifyFailure: needsRestart => setState(needsRestart ? 'idle' : 'shared'),
		onVerified: ticketsGranted => {
			setState('verified');
			syncTickets(ticketsGranted);
		},
	});

	const handleVerify = useCallback(() => verify(), [verify]);

	return {
		state,
		alreadyVerified,
		claimUsed,
		xShareClaimStatus,
		handleShare: useTokenizedFlow ? triggerTokenizedShare : triggerPlainShare,
		handleVerify,
	};
}
