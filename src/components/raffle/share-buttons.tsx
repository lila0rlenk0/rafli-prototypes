'use client';

import { Copy } from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';

interface RaffleShareButtonsProps {
	title: string;
	publicSlug: string;
}

export function RaffleShareButtons({
	title,
	publicSlug,
}: RaffleShareButtonsProps) {
	function handleCopyLink() {
		const link = `${window.location.origin}/browse/${publicSlug}`;
		navigator.clipboard.writeText(link);
		track(RAFFLE_EVENTS.SHARED, {
			raffle_slug: publicSlug,
			method: 'copy_link',
		});
		toast.success('Sweepstakes link copied to clipboard!');
	}

	function handleShareOnX() {
		const link = `${window.location.origin}/browse/${publicSlug}`;
		const text = `I just got my free entry. Join @rafli_win to get yours: ${title} ${link}`;
		const url = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
		track(RAFFLE_EVENTS.SHARED, { raffle_slug: publicSlug, method: 'twitter' });
		window.open(url, '_blank');
	}

	return (
		<div className="mt-6 flex items-center justify-between px-2">
			<button
				onClick={handleShareOnX}
				className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black"
			>
				<FaXTwitter className="size-4" />
				Share on X
			</button>
			<button
				onClick={handleCopyLink}
				className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black"
			>
				<Copy className="size-4" />
				Copy sweepstakes link
			</button>
		</div>
	);
}
