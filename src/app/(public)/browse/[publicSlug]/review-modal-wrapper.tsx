'use client';

import { useEffect, useState } from 'react';

import { ReviewHostModal } from '@/components/host/review-host-modal';
import { checkReview } from '@/services/review/check-review';

interface ReviewModalWrapperProps {
	/** The raffle ID */
	raffleId: string;
	/** The host ID */
	hostId: string;
	/** Public slug for sharing */
	publicSlug: string;
	/** Whether user's winning status is 'received' */
	hasReceivedPrize: boolean;
	/** Whether user is authenticated */
	isAuthenticated: boolean;
}

/**
 * ReviewModalWrapper Component
 *
 * Client wrapper that checks review eligibility and shows modal for winners.
 * Only displays modal if user won and hasn't already reviewed.
 */
export function ReviewModalWrapper({
	raffleId,
	hostId,
	publicSlug,
	hasReceivedPrize,
	isAuthenticated,
}: ReviewModalWrapperProps) {
	const [open, setOpen] = useState(false);
	const [hasChecked, setHasChecked] = useState(false);

	useEffect(() => {
		// Only check if user is authenticated and has received prize
		if (!isAuthenticated || !hasReceivedPrize || hasChecked) return;

		async function checkEligibility() {
			const result = await checkReview(raffleId);

			if (result.success && result.data.canReview && !result.data.hasReviewed) {
				setOpen(true);
			}

			setHasChecked(true);
		}

		checkEligibility();
	}, [isAuthenticated, hasReceivedPrize, raffleId, hasChecked]);

	// Don't render anything if conditions not met
	if (!isAuthenticated || !hasReceivedPrize) {
		return null;
	}

	return (
		<ReviewHostModal
			open={open}
			onOpenChange={setOpen}
			raffleId={raffleId}
			hostId={hostId}
			publicSlug={publicSlug}
		/>
	);
}
