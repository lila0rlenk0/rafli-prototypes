'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';

interface StickyBuyTicketsCtaProps {
	title: string;
	publicSlug: string;
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
 *
 * @returns Fixed-position bar with Enter Now + Share on X (mobile only)
 */
export function StickyBuyTicketsCta({
	title,
	publicSlug,
}: StickyBuyTicketsCtaProps) {
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

	/**
	 * Opens Twitter/X share intent
	 */
	function handleShareOnX() {
		const text = `Check out this raffle: ${title}`;
		const link = `${window.location.origin}/browse/${publicSlug}`;
		const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
		track(RAFFLE_EVENTS.SHARED, { raffle_slug: publicSlug, method: 'twitter' });
		window.open(url, '_blank');
	}

	return (
		<div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
			<Button
				onClick={handleEnterNow}
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				<p className="font-semibold">Enter Now!</p>
			</Button>
			<Button
				variant="outline"
				onClick={handleShareOnX}
				className="h-12 w-full cursor-pointer rounded-full border-2 border-black bg-white text-black hover:bg-gray-50"
			>
				<p className="font-semibold">Get Free Tickets! Share on X</p>
			</Button>
		</div>
	);
}
