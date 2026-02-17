import Link from 'next/link';

interface FulfillmentBadgeProps {
	/** Whether the raffle concluded with fewer participants than the minimum */
	isPartial: boolean;
}

/**
 * Badge indicating whether fulfillment was partial or total
 * Shows a colored pill with label and optional "What does it mean?" link
 */
export function FulfillmentBadge({ isPartial }: FulfillmentBadgeProps) {
	/**
	 * Gets badge label based on fulfillment type
	 */
	function getLabel(): string {
		return isPartial ? 'Partial Fulfilment' : 'Winners Selected';
	}

	/**
	 * Gets badge background color based on fulfillment type
	 */
	function getBadgeClass(): string {
		return isPartial ? 'bg-[#f6eeb4]' : 'bg-[#beffdb]';
	}

	return (
		<div className="flex flex-col items-center gap-4">
			<span
				className={`inline-block rounded-lg px-2 py-1 text-sm text-black ${getBadgeClass()}`}
			>
				{getLabel()}
			</span>

			{isPartial && (
				<Link
					href="/how-it-works"
					className="text-sm font-medium text-black underline"
				>
					What does it mean?
				</Link>
			)}
		</div>
	);
}
