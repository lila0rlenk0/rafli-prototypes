'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Threshold for considering the checkout section "visible enough"
 * that the user can interact with it directly. At 0.6, the buy button
 * at the bottom of the card is reliably in view.
 */
const VISIBILITY_THRESHOLD = 0.6;

/**
 * Mobile-only sticky CTA that floats at the bottom of the viewport
 * on the raffle detail page.
 *
 * - When checkout section is NOT visible: smooth-scrolls to it
 * - When checkout section IS visible: programmatically clicks the
 *   real buy button (#checkout-action) so the purchase flow starts
 *
 * Hidden on desktop (lg:) where the sidebar checkout is always alongside content.
 *
 * @returns Fixed-position buy button bar (mobile only)
 */
export function StickyBuyTicketsCta() {
	const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);

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

	function handleClick() {
		if (isCheckoutVisible) {
			/**
			 * Checkout is visible — click the actual buy/sign-in button.
			 * Falls back to scroll if the button isn't in the DOM
			 * (e.g. RaffleExpiredGate removed it mid-session).
			 */
			const actionButton = document.getElementById('checkout-action');
			if (actionButton) {
				actionButton.click();
				return;
			}
		}

		/** Checkout not visible or action button missing — scroll to it */
		document
			.getElementById('checkout-section')
			?.scrollIntoView({ behavior: 'smooth' });
	}

	return (
		<div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-4 pt-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
			<Button
				onClick={handleClick}
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				<p className="font-semibold">Buy Tickets</p>
			</Button>
		</div>
	);
}
