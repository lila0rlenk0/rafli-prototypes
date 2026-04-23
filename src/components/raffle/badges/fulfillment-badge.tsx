/**
 * Badge indicating winners have been selected for a concluded raffle.
 * Shows a green pill with "Winners Selected" label.
 */
export function FulfillmentBadge() {
	return (
		<div className="flex flex-col items-center gap-4">
			<span className="bg-brand-mint inline-block rounded-lg px-2 py-1 text-sm text-black">
				Winners Selected
			</span>
		</div>
	);
}
