'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

import { RAFFLE_EVENTS, X_SHARE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { createXShareIntent } from '@/services/raffle/create-x-share-intent';

import { getIntentErrorMessage } from './intent-errors';

interface UseXIntentParams {
	raffleId: string;
	title: string;
	publicSlug: string;
	/** Called after intent succeeds and the X tab has been opened. */
	onSharePrepared: () => void;
	/** Called at the start/end of the intent round-trip. */
	onLoading: (loading: boolean) => void;
}

/**
 * Opens X intent composer in a new tab and tracks the share event.
 *
 * Shared by both plain and tokenized flows — the only thing that varies
 * is the URL payload (public raffle link vs tokenized claim URL).
 *
 * @param params - title + publicSlug + shareUrl to open.
 */
function openXIntent(params: {
	title: string;
	publicSlug: string;
	shareUrl: string;
}): void {
	const { title, publicSlug, shareUrl } = params;
	const text = `Check out this sweepstakes: ${title}`;
	const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
	track(RAFFLE_EVENTS.SHARED, {
		raffle_slug: publicSlug,
		method: 'twitter',
	});
	window.open(intentUrl, '_blank');
}

interface UseXIntentResult {
	/** Plain share — no backend, opens X with the public raffle URL. */
	triggerPlainShare: () => void;
	/** Tokenized share — creates backend intent, opens X with the tokenized URL. */
	triggerTokenizedShare: () => Promise<void>;
}

/**
 * Handles the "create X post intent" half of the share flow.
 *
 * Plain path: open X intent with the public raffle URL — zero backend.
 * Tokenized path: POST to `/x-share-intent`, then open X with the
 * tokenized URL so the verify endpoint can later find the tweet.
 *
 * @param params - Raffle identifiers plus transition callbacks.
 * @returns `{ triggerPlainShare, triggerTokenizedShare }`.
 */
export function useXIntent(params: UseXIntentParams): UseXIntentResult {
	const { raffleId, title, publicSlug, onSharePrepared, onLoading } = params;

	// useCallback: stable identity lets consumers compose this with
	// other memoized handlers without triggering cascade re-renders.
	const triggerPlainShare = useCallback(() => {
		const link = `${window.location.origin}/browse/${publicSlug}`;
		openXIntent({ title, publicSlug, shareUrl: link });
	}, [publicSlug, title]);

	const triggerTokenizedShare = useCallback(async () => {
		onLoading(true);
		const result = await createXShareIntent(raffleId);

		if (!result.success) {
			onLoading(false);
			// Cast to string — backend codes not enumerated in the narrow
			// RaffleErrorCode union (e.g. `core:xshare:question-required`).
			const errorCode = result.error as string;
			toast.error(getIntentErrorMessage(errorCode));
			return;
		}

		// Track intent creation — measures share-for-free-ticket funnel entry.
		track(X_SHARE_EVENTS.INTENT_CREATED, {
			raffle_id: raffleId,
			raffle_slug: publicSlug,
		});

		openXIntent({ title, publicSlug, shareUrl: result.data.shareUrl });
		onSharePrepared();
	}, [onLoading, onSharePrepared, publicSlug, raffleId, title]);

	return { triggerPlainShare, triggerTokenizedShare };
}
