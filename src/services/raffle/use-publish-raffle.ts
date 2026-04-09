'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { PublishMode } from '@/components/raffle/publish-split-button';

import { publishRaffle } from './publish-raffle';
import { updateRaffle } from './update-raffle';

/**
 * Maps publish error codes to user-facing messages
 */
function getPublishErrorMessage(code: RaffleErrorCode): string {
	switch (code) {
		case RAFFLE_ERROR_CODES.NOT_DRAFT:
			return 'Raffle is not in draft status and cannot go live';
		case RAFFLE_ERROR_CODES.PERMISSION_DENIED:
			return 'You do not have permission to make this raffle go live';
		case RAFFLE_ERROR_CODES.MISSING_FIELDS:
			return 'Some required fields are missing. Complete all steps before going live.';
		case RAFFLE_ERROR_CODES.INVALID_CRYPTO_CONFIG:
			return 'Crypto payment configuration is incomplete. Ensure all tokens have pricing set.';
		default:
			return 'Failed to go live';
	}
}

interface UsePublishRaffleOptions {
	/** Raffle ID */
	raffleId: string;
	/** Raffle start date (ISO string) */
	startAt: string;
	/** Redirect path after successful publish */
	redirectTo?: string;
}

/**
 * Hook for publishing a draft raffle.
 * Handles 'now' (update startAt + publish) and 'schedule' (publish directly) modes.
 *
 * @returns isPublishing state and handlePublish callback
 */
export function usePublishRaffle({
	raffleId,
	startAt,
	redirectTo = '/my-raffles',
}: UsePublishRaffleOptions) {
	const router = useRouter();
	const [isPublishing, setIsPublishing] = useState(false);

	async function handlePublish(mode: PublishMode) {
		setIsPublishing(true);

		try {
			// For 'now': update startAt to current time so backend transitions to live
			// Skip if startAt is already today or past
			if (mode === 'now') {
				const startDate = new Date(startAt);
				startDate.setHours(0, 0, 0, 0);
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				if (startDate > today) {
					const updateResult = await updateRaffle(raffleId, {
						startAt: new Date().toISOString(),
					});
					if (!updateResult.success) {
						toast.error(getPublishErrorMessage(updateResult.error));
						return;
					}
				}
			}

			const result = await publishRaffle(raffleId);
			if (!result.success) {
				toast.error(getPublishErrorMessage(result.error));
				return;
			}

			// Feedback matches the selected mode so hosts know what to expect
			const message =
				mode === 'now'
					? 'Your raffle is going live! It may take 1-2 minutes.'
					: 'Your raffle is scheduled. It will go live at the start time you set.';
			toast.info(message);
			router.push(redirectTo);
		} catch (error) {
			// Unexpected error (network failure, serialization) — updateRaffle/publishRaffle
			// failures are handled above via ServiceResponse, this catches unhandled throws
			console.error('[usePublishRaffle] Unexpected error:', error);
			toast.error('Something went wrong. Please try again');
		} finally {
			setIsPublishing(false);
		}
	}

	return { isPublishing, handlePublish };
}
