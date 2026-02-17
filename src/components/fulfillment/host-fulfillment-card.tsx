import { Users } from 'lucide-react';
import Link from 'next/link';

import { FulfillmentBadge } from '@/components/raffle/fulfillment-badge';

interface HostFulfillmentCardProps {
	/** Public slug for the raffle */
	publicSlug: string;
	/** Number of winners to fulfill */
	winnersCount: number;
	/** Whether the raffle concluded with fewer participants than the minimum */
	isPartialFulfillment: boolean;
}

/**
 * HostFulfillmentCard Component
 *
 * Displays delivery status card for hosts on concluded raffles.
 * Provides link to manage all winners fulfillment.
 */
export function HostFulfillmentCard({
	publicSlug,
	winnersCount,
	isPartialFulfillment,
}: HostFulfillmentCardProps) {
	/**
	 * Formats the winners count message
	 */
	function getWinnersMessage(): string {
		if (winnersCount === 1) {
			return '1 winner awaiting fulfillment';
		}
		return `${winnersCount} winners awaiting fulfillment`;
	}

	return (
		<div className="min-w-sm rounded-2xl bg-white p-6">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-semibold">Delivery status</h3>
			</div>

			<div className="mb-4">
				<FulfillmentBadge isPartial={isPartialFulfillment} />
			</div>

			<p className="mb-6 text-sm text-gray-600">{getWinnersMessage()}</p>

			<Link
				href={`/browse/${publicSlug}/fulfillment`}
				className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-black bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
			>
				<Users className="size-4" />
				Manage All Winners
			</Link>
		</div>
	);
}
