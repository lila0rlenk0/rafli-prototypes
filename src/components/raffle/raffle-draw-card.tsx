import { Loader2 } from 'lucide-react';

/** Shown during the VRF draw (ended but no winners yet) — replaces the "not won" card. */
export function RaffleDrawCard() {
	return (
		<div className="rounded-2xl border border-black bg-white px-16 py-8">
			<Loader2 className="mx-auto size-12 animate-spin" />

			<h2 className="font-clash-display mt-8 text-center text-2xl font-semibold">
				Selecting winners...
			</h2>

			<p className="mt-4 text-center text-sm text-gray-600">
				Results are being verified on-chain. This usually takes a few minutes.
			</p>
		</div>
	);
}
