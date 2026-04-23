'use client';

import { Copy } from 'lucide-react';
import Link from 'next/link';
import { FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';

import { TicketIcon } from './decorations';
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

interface PaymentStatusPaidProps {
	publicSlug: string;
	isParticipant: boolean;
}

/**
 * Paid success screen — ticket hero icon, celebration copy, optional
 * "View My Sweepstakes" link for participants, and a social share row.
 */
export function PaymentStatusPaid({
	publicSlug,
	isParticipant,
}: PaymentStatusPaidProps) {
	function handleCopyLink() {
		const link = `${window.location.origin}/browse/${publicSlug}`;
		void navigator.clipboard.writeText(link).then(
			() => toast.success('Sweepstakes link copied to clipboard!'),
			() => toast.error('Could not copy link.'),
		);
	}

	function handleShare() {
		const text = 'Check out this sweepstakes';
		const link = `${window.location.origin}/browse/${publicSlug}`;
		const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
		window.open(url, '_blank', 'noopener,noreferrer');
	}

	return (
		<>
			<DialogHeader className="z-1 flex flex-col items-center justify-center gap-2">
				<div className="flex justify-center pb-4">
					<TicketIcon />
				</div>
				<DialogTitle className="font-clash-display text-3xl">
					Entries confirmed. <br />
					You&apos;re officially in!
				</DialogTitle>
				<DialogDescription className="text-center text-black">
					Thanks for entering this sweepstakes — your entry has been recorded.{' '}
					<br />
					Winners will be announced once the draw closes.
				</DialogDescription>

				{isParticipant ? (
					<div className="my-6">
						<Link
							href="/my-raffles"
							className="rounded-full border border-black px-12 py-3 text-sm font-semibold"
						>
							View My Sweepstakes
						</Link>
					</div>
				) : null}
			</DialogHeader>
			<div className="z-1 flex w-full flex-col items-center justify-center gap-4">
				<p className="text-xl font-medium">Share your sweepstakes!</p>
				<div className="flex items-center justify-center gap-8">
					<button
						type="button"
						onClick={handleShare}
						className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black"
					>
						<FaXTwitter className="size-4" />
						Share on X
					</button>
					<button
						type="button"
						onClick={handleCopyLink}
						className="flex items-center justify-center gap-2 text-sm font-medium"
					>
						<Copy className="size-4" />
						Copy sweepstakes link
					</button>
				</div>
			</div>
		</>
	);
}
