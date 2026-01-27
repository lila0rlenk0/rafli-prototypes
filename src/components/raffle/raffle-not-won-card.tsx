import { Goal } from 'lucide-react';

/**
 * RaffleNotWonCard Component
 *
 * Displayed to users who participated in a concluded raffle but did not win.
 */
export function RaffleNotWonCard() {
	return (
		<div className="rounded-2xl border border-black bg-white px-24 py-8">
			<Goal className="mx-auto size-12" />

			<h2 className="font-clash-display mt-8 text-center text-2xl font-semibold text-nowrap">
				The raffle is ended!
			</h2>
		</div>
	);
}
