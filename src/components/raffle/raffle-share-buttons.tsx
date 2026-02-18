'use client';

import { Copy } from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';

interface RaffleShareButtonsProps {
	title: string;
	publicSlug: string;
}

/**
 * RaffleShareButtons Component
 *
 * Provides social sharing and link copying functionality for raffles.
 * Includes buttons for sharing on X (Twitter) and copying the raffle link
 * to clipboard.
 */
export function RaffleShareButtons({
	title,
	publicSlug,
}: RaffleShareButtonsProps) {
	/**
	 * Copies the raffle link to the clipboard
	 * Shows a success toast notification when copied
	 */
	function handleCopyLink() {
		const link = `${window.location.origin}/browse/${publicSlug}`;
		navigator.clipboard.writeText(link);
		toast.success('Raffle link copied to clipboard!');
	}

	/**
	 * Opens a Twitter/X share intent in a new tab
	 * Includes the raffle title and link in the tweet
	 */
	function handleShareOnX() {
		const text = `Check out this raffle: ${title}`;
		const link = `${window.location.origin}/browse/${publicSlug}`;
		const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
		window.open(url, '_blank');
	}

	return (
		<div className="mt-6 flex items-center justify-between px-2">
			<button
				onClick={handleShareOnX}
				className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black"
			>
				<FaXTwitter className="h-4 w-4" />
				Share on X
			</button>
			<button
				onClick={handleCopyLink}
				className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black"
			>
				<Copy className="h-4 w-4" />
				Copy Raffle link
			</button>
		</div>
	);
}
