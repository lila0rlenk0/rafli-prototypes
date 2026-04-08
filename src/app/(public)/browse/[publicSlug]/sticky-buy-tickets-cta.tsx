'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

import { type XShareConfig, useXShare } from './use-x-share';

interface StickyBuyTicketsCtaProps extends XShareConfig {
	/** Unauthenticated users get plain share — can't attribute tickets without an account */
	isAuthenticated: boolean;
}

/**
 * Threshold for considering the checkout section "visible enough"
 * that the user can interact with it directly. At 0.6, the buy button
 * at the bottom of the card is reliably in view.
 */
const VISIBILITY_THRESHOLD = 0.6;

/**
 * Sticky CTA bar at the bottom of the viewport with "Enter Now!" and
 * "Get Free Tickets! Share on X" buttons.
 *
 * - When checkout section is NOT visible: smooth-scrolls to it
 * - When checkout section IS visible: programmatically clicks the
 *   real buy button (#checkout-action) so the purchase flow starts
 *
 * Hidden on desktop (lg:) where the sidebar checkout is always alongside content.
 */
export function StickyBuyTicketsCta({
	raffleId,
	title,
	publicSlug,
	xShareEnabled,
	xShareClaimStatus,
	isAuthenticated,
}: StickyBuyTicketsCtaProps) {
	const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);

	const { state, alreadyVerified, handleShare, handleVerify } = useXShare({
		raffleId,
		title,
		publicSlug,
		// Unauthenticated users always get plain share — tokenized flow requires auth
		xShareEnabled: isAuthenticated && xShareEnabled,
		xShareClaimStatus,
	});

	// mount: observe checkout section visibility for scroll-to / click-through CTA
	useEffect(() => {
		const target = document.getElementById('checkout-section');
		if (!target) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsCheckoutVisible(entry.intersectionRatio >= VISIBILITY_THRESHOLD);
			},
			{ threshold: [0, VISIBILITY_THRESHOLD] },
		);

		observer.observe(target);

		return () => {
			observer.disconnect();
		};
	}, []);

	function handleEnterNow() {
		if (isCheckoutVisible) {
			const actionButton = document.getElementById('checkout-action');
			if (actionButton) {
				actionButton.click();
				return;
			}
		}

		document
			.getElementById('checkout-section')
			?.scrollIntoView({ behavior: 'smooth' });
	}

	function renderShareButton() {
		// Already earned — no button in the sticky bar, keep it clean
		if (alreadyVerified) return null;

		if (state === 'shared' || state === 'verifying') {
			return (
				<Button
					variant="outline"
					onClick={handleVerify}
					disabled={state === 'verifying'}
					className="h-12 w-full cursor-pointer rounded-full border-2 border-black bg-white text-black hover:bg-gray-50"
				>
					<p className="font-semibold">
						{state === 'verifying'
							? 'Verifying...'
							: 'I shared it — Claim my free ticket!'}
					</p>
				</Button>
			);
		}

		return (
			<Button
				variant="outline"
				onClick={handleShare}
				disabled={state === 'loading'}
				className="h-12 w-full cursor-pointer rounded-full border-2 border-black bg-white text-black hover:bg-gray-50"
			>
				<p className="font-semibold">
					{state === 'loading'
						? 'Preparing...'
						: 'Get Free Tickets! Share on X'}
				</p>
			</Button>
		);
	}

	return (
		<div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
			<Button
				onClick={handleEnterNow}
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				<p className="font-semibold">Enter Now!</p>
			</Button>
			{renderShareButton()}
		</div>
	);
}
