import { Clock, Loader2, RefreshCw } from 'lucide-react';

interface RaffleDrawCardProps {
	/** When true, polling has exhausted its timeout budget — show stale-data hint */
	timedOut?: boolean;
	/** Manual refresh callback — fires router.refresh() from the client wrapper */
	onRefresh?: () => void;
}

/** Shown during the VRF draw (ended but no winners yet) — replaces the "not won" card. */
export function RaffleDrawCard({ timedOut, onRefresh }: RaffleDrawCardProps) {
	if (timedOut) {
		return (
			<div className="rounded-2xl border border-black bg-white px-16 py-8">
				<Clock className="mx-auto size-12 text-amber-500" />

				<h2 className="font-clash-display mt-8 text-center text-2xl font-semibold">
					Taking longer than usual
				</h2>

				<p className="mt-4 text-center text-sm text-gray-600">
					The draw is still being processed on-chain. This can happen during
					network congestion.
				</p>

				{onRefresh ? (
					<button
						type="button"
						onClick={onRefresh}
						className="mx-auto mt-6 flex cursor-pointer items-center gap-2 rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
					>
						<RefreshCw className="size-4" />
						Refresh
					</button>
				) : null}
			</div>
		);
	}

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
