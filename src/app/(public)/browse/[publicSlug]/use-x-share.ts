'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
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
	xShareDailyLimitReached?: boolean;
}

interface UseXShareResult {
	state: XShareState;
	/** True when the user already earned their ticket for this raffle */
	alreadyVerified: boolean;
	handleShare: () => void | Promise<void>;
	handleVerify: () => Promise<void>;
}

/**
 * Shared hook for X share → verify → free ticket flow.
 *
 * Handles three scenarios:
 * 1. Tokenized flow: create intent → open X with tokenized URL → verify
 * 2. Resume pending: user had a pending claim from a prior session → show verify directly
 * 3. Plain share: xShare disabled or already verified → just open X intent
 */
export function useXShare({
	raffleId,
	title,
	publicSlug,
	xShareEnabled,
	xShareClaimStatus,
	xShareDailyLimitReached,
}: XShareConfig): UseXShareResult {
	const router = useRouter();
	const alreadyVerified = xShareClaimStatus === 'verified';

	// Resume verify state if the user has a pending claim from a prior session
	// (they shared but navigated away before verifying)
	const initialState: XShareState =
		xShareClaimStatus === 'pending' ? 'shared' : 'idle';
	const [state, setState] = useState<XShareState>(initialState);

	const useTokenizedFlow =
		xShareEnabled && !alreadyVerified && !xShareDailyLimitReached;

	// mount: strip xref token from URL — only meaningful to backend, noisy in address
	// bar, and could leak the claim token if the user copies the URL.
	useEffect(() => {
		const url = new URL(window.location.href);
		if (!url.searchParams.has('xref')) return;

		url.searchParams.delete('xref');
		window.history.replaceState(null, '', url.pathname + (url.search || ''));
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
	 * Used when xShare is disabled, user already claimed, or daily limit reached.
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
		// Guard: daily limit already reached — toast instead of wasting an API call
		if (xShareDailyLimitReached) {
			toast.info('You already earned a free ticket today. Come back tomorrow!');
			return;
		}

		setState('loading');

		const result = await createXShareIntent(raffleId);

		if (!result.success) {
			setState('idle');
			toast.error('Could not prepare share link. Please try again.');
			return;
		}

		openXIntent(result.data.shareUrl);
		setState('shared');
	}

	/**
	 * Verify the share — backend searches X API for the tweet containing
	 * the tokenized URL and grants one free ticket if found.
	 */
	async function handleVerify() {
		setState('verifying');

		const result = await verifyXShare(raffleId);

		if (!result.success) {
			setState('shared');
			toast.error('Verification failed. Please try again.');
			return;
		}

		if (result.data.status === 'verified') {
			setState('idle');
			toast.success('Free ticket granted!');
			// Server action already revalidated the raffle cache tag — refresh
			// re-renders server components with fresh data (ticket count, claim status)
			router.refresh();
			return;
		}

		// Tweet not found — provide actionable feedback based on reason
		setState('shared');

		if (result.data.reason === 'not_found') {
			toast.info(
				'Post not indexed yet — X can take a minute. Try again shortly.',
			);
		} else if (result.data.reason === 'not_found_or_private') {
			toast.error(
				'Post not found. Make sure your account is public and the post exists.',
			);
		} else if (result.data.reason === 'x_api_unavailable') {
			toast.error('X is temporarily unavailable. Please try again later.');
		}
	}

	return {
		state,
		alreadyVerified,
		handleShare: useTokenizedFlow ? handleTokenizedShare : handlePlainShare,
		handleVerify,
	};
}
