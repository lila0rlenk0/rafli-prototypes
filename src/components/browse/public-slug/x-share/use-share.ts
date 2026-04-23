'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
	type AutoRetryController,
	createAutoRetryController,
} from './auto-retry';
import { useXIntent } from './use-intent';
import { useXVerify } from './use-verify';

type XShareState = 'idle' | 'loading' | 'shared' | 'verifying';

interface VerifyWiringParams {
	raffleId: string;
	publicSlug: string;
	retryController: AutoRetryController;
	setState: (s: XShareState) => void;
	setRetryCountdown: (n: number) => void;
	verifyRef: React.RefObject<() => Promise<void>>;
}

/**
 * Wires the verify hook to orchestrator state + auto-retry controller.
 * Extracted so `useXShare` stays under the 60-line cap — the verify
 * callbacks alone would push it over.
 *
 * @param params - State setters + shared auto-retry controller.
 * @returns The memoized `handleVerify` callback consumers bind to.
 */
function useVerifyWithRetry(params: VerifyWiringParams): () => Promise<void> {
	const {
		raffleId,
		publicSlug,
		retryController,
		setState,
		setRetryCountdown,
		verifyRef,
	} = params;

	const { verify } = useXVerify({
		raffleId,
		publicSlug,
		onVerifyStart: () => {
			// Cancel pending retry so we don't double-schedule when the
			// user taps verify manually (or auto-retry fires).
			retryController.cancel();
			setRetryCountdown(0);
			setState('verifying');
		},
		onVerifyFailure: needsRestart => setState(needsRestart ? 'idle' : 'shared'),
		onVerified: () => setState('idle'),
		onNotFound: () => {
			setState('shared');
			retryController.start(setRetryCountdown, () => {
				void verifyRef.current();
			});
		},
	});

	return useCallback(() => verify(), [verify]);
}

/** Props needed by both ShareOnXButton and StickyBuyTicketsCta. */
export interface XShareConfig {
	raffleId: string;
	title: string;
	publicSlug: string;
	xShareEnabled: boolean;
	xShareClaimStatus?: 'completed' | 'expired' | 'pending' | null;
	/** When set, user must answer the quiz correctly before sharing (same gate as purchase flow) */
	questionId?: string | null;
}

interface UseXShareResult {
	state: XShareState;
	/** True when the user already earned their bonus entry for this sweepstakes */
	alreadyVerified: boolean;
	/** True when the claim is in any terminal state (completed/expired) — no re-share allowed */
	claimUsed: boolean;
	/** Raw claim status for per-status UI messaging */
	xShareClaimStatus?: 'completed' | 'expired' | 'pending' | null;
	/** Seconds until auto-retry fires (0 = no countdown active) */
	retryCountdown: number;
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
 * Shared hook for X share → verify → free ticket flow.
 *
 * Orchestrates three sub-concerns:
 *  1. Intent creation (`use-intent`) — plain or tokenized share.
 *  2. Verify + transitions (`use-verify`) — claim the bonus entry.
 *  3. Auto-retry (`auto-retry`) — re-verify when X hasn't indexed yet.
 *
 * Return shape is preserved exactly for `ShareOnXButton` and
 * `StickyBuyTicketsCta` — both call the hook directly.
 *
 * @param config - Raffle identifiers + claim status + share gate flag.
 * @returns `{ state, alreadyVerified, claimUsed, xShareClaimStatus,
 *   retryCountdown, handleShare, handleVerify }` preserving the original
 *   contract with `ShareOnXButton` and `StickyBuyTicketsCta`.
 */
export function useXShare({
	raffleId,
	title,
	publicSlug,
	xShareEnabled,
	xShareClaimStatus,
}: XShareConfig): UseXShareResult {
	// Any terminal status means the user's one chance is consumed — no
	// resets. completed = ticket earned, expired = opportunity used.
	const alreadyVerified = xShareClaimStatus === 'completed';
	const claimUsed = alreadyVerified || xShareClaimStatus === 'expired';
	// Resume "verify" UI if the user has a pending claim from a prior
	// session (they shared but navigated away before verifying).
	const [state, setState] = useState<XShareState>(
		xShareClaimStatus === 'pending' ? 'shared' : 'idle',
	);
	const [retryCountdown, setRetryCountdown] = useState(0);

	// Stable controller via `useState` lazy init — idiomatic React 19
	// pattern for a singleton created outside render. Reading a ref's
	// `.current` during render is banned by `react-hooks/refs`.
	const [retryController] = useState<AutoRetryController>(
		createAutoRetryController,
	);
	// Ref to the latest verify so the auto-retry onFire closure always
	// calls the freshest callback (router/props change across renders).
	const verifyRef = useRef<() => Promise<void>>(() => Promise.resolve());

	useStripXrefToken();
	// useEffect: mount-only cleanup so the interval never leaks.
	useEffect(() => {
		return () => retryController.cancel();
	}, [retryController]);

	const useTokenizedFlow = xShareEnabled && !claimUsed;

	const { triggerPlainShare, triggerTokenizedShare } = useXIntent({
		raffleId,
		title,
		publicSlug,
		onLoading: loading => setState(loading ? 'loading' : 'idle'),
		onSharePrepared: () => setState('shared'),
	});

	const handleVerify = useVerifyWithRetry({
		raffleId,
		publicSlug,
		retryController,
		setState,
		setRetryCountdown,
		verifyRef,
	});

	// useEffect: keep verifyRef pointing to the latest handleVerify so
	// the auto-retry timer fires the freshest closure (stale verify
	// would use outdated router/props).
	useEffect(() => {
		verifyRef.current = handleVerify;
	}, [handleVerify]);

	return {
		state,
		alreadyVerified,
		claimUsed,
		xShareClaimStatus,
		retryCountdown,
		handleShare: useTokenizedFlow ? triggerTokenizedShare : triggerPlainShare,
		handleVerify,
	};
}
