import { Goal, ServerCrash } from 'lucide-react';
import Link from 'next/link';

import { FulfillmentBadge } from '@/components/raffle/fulfillment-badge';
import { RAFFLE_STATUS, type RaffleStatus } from '@/types/raffle';

interface RaffleNotWonCardProps {
	/** Current raffle status */
	status: RaffleStatus;
}

/**
 * RaffleNotWonCard Component
 *
 * Displayed to users who participated in a concluded raffle but did not win.
 * Shows different messages based on raffle status.
 */
export function RaffleNotWonCard({ status }: RaffleNotWonCardProps) {
	function getMessage(): string {
		switch (status) {
			case RAFFLE_STATUS.FULFILLING:
				return 'The results are being processed...';
			case RAFFLE_STATUS.COMPLETED:
				return 'The raffle is complete!';
			default:
				return 'The raffle has ended!';
		}
	}

	const isFulfilling = status === RAFFLE_STATUS.FULFILLING;
	const Icon = isFulfilling ? ServerCrash : Goal;

	return (
		<div className="rounded-2xl border border-black bg-white px-16 py-8">
			<Icon className="mx-auto size-12" />

			<h2 className="font-clash-display mt-8 text-center text-2xl font-semibold">
				{getMessage()}
			</h2>

			{!isFulfilling ? (
				<div className="mt-4">
					<FulfillmentBadge />
				</div>
			) : null}

			{isFulfilling ? (
				<Link
					href="/how-it-works"
					className="mt-4 block text-center text-sm text-gray-600 underline hover:text-black"
				>
					Learn how it works
				</Link>
			) : null}
		</div>
	);
}
