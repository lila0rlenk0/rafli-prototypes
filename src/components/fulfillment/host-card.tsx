import { Users } from 'lucide-react';
import Link from 'next/link';

import { FulfillmentBadge } from '@/components/raffle/badges/fulfillment-badge';

interface HostFulfillmentCardProps {
	/** Public slug for the raffle */
	publicSlug: string;
	/** Number of winners to fulfill */
	winnersCount: number;
}

export function HostFulfillmentCard({
	publicSlug,
	winnersCount,
}: HostFulfillmentCardProps) {
	const winnersMessage =
		winnersCount === 1
			? '1 winner awaiting fulfillment'
			: `${winnersCount} winners awaiting fulfillment`;

	return (
		<div className="min-w-sm rounded-2xl border border-black bg-white p-6">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-semibold">Delivery status</h3>
			</div>

			<div className="mb-4">
				<FulfillmentBadge />
			</div>

			<p className="mb-6 text-sm text-gray-600">{winnersMessage}</p>

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
