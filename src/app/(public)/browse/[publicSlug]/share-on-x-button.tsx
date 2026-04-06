'use client';

import { Button } from '@/components/ui/button';
import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';

interface ShareOnXButtonProps {
	title: string;
	publicSlug: string;
}

/**
 * Prominent "Get Free Tickets! Share on X" button for the desktop checkout card.
 * Mirrors the mobile sticky CTA share button style.
 *
 * @returns Outline button that opens Twitter/X share intent
 */
export function ShareOnXButton({ title, publicSlug }: ShareOnXButtonProps) {
	function handleShareOnX() {
		const text = `Check out this raffle: ${title}`;
		const link = `${window.location.origin}/browse/${publicSlug}`;
		const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
		track(RAFFLE_EVENTS.SHARED, {
			raffle_slug: publicSlug,
			method: 'twitter',
		});
		window.open(url, '_blank');
	}

	return (
		<Button
			variant="outline"
			onClick={handleShareOnX}
			className="mt-2 h-12 w-full cursor-pointer rounded-full border-2 border-black bg-white text-black hover:bg-gray-50"
		>
			<p className="font-semibold">Get Free Tickets! Share on X</p>
		</Button>
	);
}
