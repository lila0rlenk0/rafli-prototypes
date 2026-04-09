'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { RAFFLE_EVENTS, X_SHARE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { createXShareIntent } from '@/services/raffle/create-x-share-intent';
import { verifyXShare } from '@/services/raffle/verify-x-share';

type XShareState = 'idle' | 'loading' | 'shared' | 'verifying';

/** Props needed by both ShareOnXButton and StickyBuyTicketsCta */
export interface XShareConfig {
	raffleId: string;
	title: string;
	publicSlug: string;
	xShareEnabled: boolean;
	xShareClaimStatus?: 'expired' | 'pending' | 'revoked' | 'verified' | null;
}

interface UseXShareResult {
	state: XShareState;
	/** True when the user already earned their ticket for this raffle */
	alreadyVerified: boolean;
	/** True when the claim is in any terminal state (verified/expired/revoked) — no re-share allowed */
	claimUsed: boolean;
	/** Raw claim status for per-status UI messaging */
	xShareClaimStatus?: 'expired' | 'pending' | 'revoked' | 'verified' | null;
	/** Seconds until auto-retry fires (0 = no countdown active) */
	retryCountdown: number;
	handleShare: () => void | Promise<void>;
	handleVerify: () => Promise<void>;
}

// =============================================================================
// ERROR MESSAGE MAPPERS
// =============================================================================

/**
 * Maps backend error codes from createXShareIntent to user-friendly toast messages.
 * Every APIError code from CreateXShareIntentCommand is covered — no silent fallbacks.
 */
function getIntentErrorMessage(errorCode: string): string {
	switch (errorCode) {
		case 'core:xshare:already-claimed':
			// Covers verified (earned), expired (missed window), and revoked claims.
			// Normally the button is disabled before this fires — this is a fallback
			// for stale frontend state (e.g. claim created in another tab).
			return 'Already claimed free entry.';
		case 'core:xshare:question-required':
			return 'Answer the raffle question first to unlock sharing.';
		case 'core:xshare:disabled':
			return 'Free ticket sharing is not available for this raffle.';
		case 'core:raffle:not-live':
			return 'This raffle is no longer active.';
		case 'core:raffle:not-found':
			return 'This raffle no longer exists.';
		// Endpoint-level rate limit (30/min on write tier)
		case 'global:ratelimit:exceeded':
			return 'Too many requests — please wait a moment and try again.';
		// Network / timeout / unknown — actionable fallback
		case 'network_error':
			return 'Network issue — check your connection and try again.';
		case 'timeout_error':
			return 'Request timed out — please try again.';
		default:
			return 'Something went wrong. Please try again.';
	}
}

/**
 * Maps backend error codes from verifyXShare to user-friendly toast messages.
 * Every APIError code from VerifyXShareCommand is covered.
 */
function getVerifyErrorMessage(errorCode: string): string {
	switch (errorCode) {
		case 'core:xshare:expired':
			return 'Your share link has expired. Each raffle allows one free ticket share attempt.';
		case 'core:xshare:rate-limited':
			return 'Please wait a few seconds before trying again.';
		case 'core:xshare:not-found':
			return 'No share claim found. Tap "Share on X" to start.';
		case 'core:xshare:disabled':
			return 'Free ticket sharing was turned off for this raffle.';
		case 'core:raffle:not-live':
			return 'This raffle is no longer active.';
		case 'core:raffle:not-found':
			return 'This raffle no longer exists.';
		case 'core:raffle:sold-out':
			return 'This raffle is sold out — no more tickets available.';
		// Endpoint-level rate limit (5/min on strict tier)
		case 'global:ratelimit:exceeded':
			return 'Too many requests — please wait a moment and try again.';
		case 'network_error':
			return 'Network issue — check your connection and try again.';
		case 'timeout_error':
			return 'Request timed out — please try again.';
		default:
			return 'Verification failed. Please try again.';
	}
}

// =============================================================================
// AUTO-RETRY
// =============================================================================

/** Seconds to wait before auto-retrying when tweet is not yet indexed */
const AUTO_RETRY_DELAY_S = 15;

/**
 * Shows a toast for not-found result and returns whether auto-retry should fire.
 * With the simplified flow, not_found always auto-retries — the next attempt
 * will either find the indexed tweet or auto-approve after max attempts.
 */
function handleNotFoundReason(reason: 'not_found' | null): boolean {
	if (reason === 'not_found') {
		toast.info(
			"Your post hasn't been indexed by X yet — we'll automatically check again in a few seconds.",
		);
		return true;
	}

	toast.error('Verification failed. Please try again.');
	return false;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Shared hook for X share → verify → free ticket flow.
 *
 * Handles three scenarios:
 * 1. Tokenized flow: create intent → open X with tokenized URL → verify
 * 2. Resume pending: user had a pending claim from a prior session → show verify directly
 * 3. Plain share: xShare disabled or claim terminal (verified/expired/revoked) → just open X intent
 *
 * Auto-retry: when X API hasn't indexed the tweet yet, starts a countdown
 * and automatically re-verifies after AUTO_RETRY_DELAY_S seconds.
 */
export function useXShare({
	raffleId,
	title,
	publicSlug,
	xShareEnabled,
	xShareClaimStatus,
}: XShareConfig): UseXShareResult {
	const router = useRouter();
	// Any terminal status means the user's one chance is consumed — no resets.
	// verified = ticket earned, expired/revoked = opportunity used without earning.
	const alreadyVerified = xShareClaimStatus === 'verified';
	const claimUsed =
		alreadyVerified ||
		xShareClaimStatus === 'expired' ||
		xShareClaimStatus === 'revoked';

	// Resume verify state if the user has a pending claim from a prior session
	// (they shared but navigated away before verifying)
	const initialState: XShareState =
		xShareClaimStatus === 'pending' ? 'shared' : 'idle';
	const [state, setState] = useState<XShareState>(initialState);

	// Countdown for auto-retry — ticks every second, fires verify at 0
	const [retryCountdown, setRetryCountdown] = useState(0);
	const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Disable tokenized flow when the claim is in any terminal state — backend
	// will reject with already-claimed anyway, but skip the round-trip entirely.
	const useTokenizedFlow = xShareEnabled && !claimUsed;
	const handleVerifyRef = useRef<() => Promise<void>>(() => Promise.resolve());

	// Cleanup auto-retry timer on unmount
	useEffect(() => {
		return () => {
			if (retryTimerRef.current) clearInterval(retryTimerRef.current);
		};
	}, []);

	// mount: strip xref token from URL — only meaningful to backend, noisy in address
	// bar, and could leak the claim token if the user copies the URL.
	useEffect(() => {
		const url = new URL(window.location.href);
		if (!url.searchParams.has('xref')) return;

		url.searchParams.delete('xref');
		window.history.replaceState(null, '', url.pathname + (url.search || ''));
	}, []);

	/** Starts a visible countdown that auto-fires handleVerify at zero */
	const startAutoRetry = useCallback(() => {
		// Clear any existing timer
		if (retryTimerRef.current) clearInterval(retryTimerRef.current);

		setRetryCountdown(AUTO_RETRY_DELAY_S);

		retryTimerRef.current = setInterval(() => {
			setRetryCountdown(prev => {
				if (prev <= 1) {
					// Timer expired — clear interval, fire verify
					if (retryTimerRef.current) clearInterval(retryTimerRef.current);
					retryTimerRef.current = null;
					// Trigger verify on the next tick so the countdown render commits
					// before the async verification flow mutates hook state again.
					setTimeout(() => {
						void handleVerifyRef.current();
					}, 0);
					return 0;
				}
				return prev - 1;
			});
		}, 1_000);
	}, []);

	/**
	 * Opens X intent with the given URL and tracks the share event.
	 * Centralizes the X intent pattern used by both plain and tokenized flows.
	 */
	function openXIntent(shareUrl: string) {
		const text = `Check out this raffle: ${title}`;
		const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
		track(RAFFLE_EVENTS.SHARED, {
			raffle_slug: publicSlug,
			method: 'twitter',
		});
		window.open(intentUrl, '_blank');
	}

	/**
	 * Plain share — no backend, just opens X intent with the public raffle URL.
	 * Used when xShare is disabled or user already claimed their ticket.
	 */
	function handlePlainShare() {
		const link = `${window.location.origin}/browse/${publicSlug}`;
		openXIntent(link);
	}

	/**
	 * Tokenized share — creates backend intent, opens X with tokenized URL,
	 * then transitions to verify state so the user can claim their ticket.
	 */
	async function handleTokenizedShare() {
		setState('loading');

		const result = await createXShareIntent(raffleId);

		if (!result.success) {
			setState('idle');
			const errorCode = result.error as string;
			toast.error(getIntentErrorMessage(errorCode));
			return;
		}

		// Track intent creation — measures share-for-free-ticket funnel entry
		track(X_SHARE_EVENTS.INTENT_CREATED, {
			raffle_id: raffleId,
			raffle_slug: publicSlug,
		});

		openXIntent(result.data.shareUrl);
		setState('shared');
	}

	/**
	 * Verify the share — backend searches X API for the tweet containing
	 * the tokenized URL and grants one free ticket if found.
	 *
	 * When tweet is not yet indexed, starts an auto-retry countdown so the
	 * user doesn't have to manually tap verify repeatedly.
	 */
	const handleVerify = useCallback(async () => {
		// Cancel any running auto-retry — user tapped manually or auto-retry fired
		if (retryTimerRef.current) {
			clearInterval(retryTimerRef.current);
			retryTimerRef.current = null;
			setRetryCountdown(0);
		}

		setState('verifying');

		const result = await verifyXShare(raffleId);

		if (!result.success) {
			// Cast to string for backend codes not enumerated in RaffleErrorCode's
			// narrow union (e.g. core:xshare:expired, core:xshare:rate-limited).
			const errorCode = result.error as string;

			track(X_SHARE_EVENTS.VERIFICATION_FAILED, {
				raffle_id: raffleId,
				raffle_slug: publicSlug,
				error_code: errorCode,
			});

			// not-found restarts from scratch — expired is now terminal (no re-share)
			const needsRestart = errorCode === 'core:xshare:not-found';
			setState(needsRestart ? 'idle' : 'shared');

			toast.error(getVerifyErrorMessage(errorCode));
			return;
		}

		if (result.data.status === 'verified') {
			setState('idle');

			// Track successful verification — free ticket granted
			track(X_SHARE_EVENTS.VERIFIED, {
				raffle_id: raffleId,
				raffle_slug: publicSlug,
				tickets_granted: result.data.ticketsGranted,
			});

			// Show ticket count when available — usually 1, but could be more
			const ticketWord =
				result.data.ticketsGranted === 1 ? 'ticket' : 'tickets';
			toast.success(`Free ${ticketWord} granted! You're in the raffle now.`);

			// Server action already revalidated the raffle cache tag — refresh
			// re-renders server components with fresh data (ticket count, claim status)
			router.refresh();
			return;
		}

		// Tweet not found — provide actionable feedback based on reason
		setState('shared');

		// Track not-found as verification failure — includes reason for analysis
		track(X_SHARE_EVENTS.VERIFICATION_FAILED, {
			raffle_id: raffleId,
			raffle_slug: publicSlug,
			error_code: 'not_found',
			reason: result.data.reason,
		});

		const shouldAutoRetry = handleNotFoundReason(result.data.reason);
		if (shouldAutoRetry) {
			startAutoRetry();
		}
	}, [publicSlug, raffleId, router, startAutoRetry]);

	// The retry timer needs the freshest verify logic after router/raffle props change.
	// Keep the ref in sync in an effect so the timer callback never closes over stale state.
	useEffect(() => {
		handleVerifyRef.current = handleVerify;
	}, [handleVerify]);

	return {
		state,
		alreadyVerified,
		claimUsed,
		xShareClaimStatus,
		retryCountdown,
		handleShare: useTokenizedFlow ? handleTokenizedShare : handlePlainShare,
		handleVerify,
	};
}
