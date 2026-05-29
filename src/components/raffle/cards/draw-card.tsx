import { Clock, RefreshCw } from 'lucide-react';

import { OrbitalCards } from '@/components/raffle/reveal/orbital-cards';
import { buildParticipantSample } from '@/components/raffle/reveal/reveal-state';
import { Button } from '@/components/ui/button';

interface RaffleDrawCardProps {
	timedOut?: boolean;
	onRefresh?: () => void;
}

/**
 * Pending-draw surface shown while VRF runs (status `ended` / `fulfilling`
 * without winners). Mirrors the reveal dialog's `LoadingFrame` design
 * language — same orbital ring, brand-yellow accent and "on-chain via
 * Chainlink VRF" subtitle — so the page-level surface and the full-screen
 * overlay don't read as different products. The `timedOut` variant drops the
 * orbit and exposes a manual refresh when polling has exhausted its budget.
 *
 * @returns Draw-in-progress card or its timed-out fallback
 */
export function RaffleDrawCard({ timedOut, onRefresh }: RaffleDrawCardProps) {
	if (timedOut) {
		return (
			<div
				role="status"
				aria-live="polite"
				className="border-border bg-card flex flex-col items-center rounded-2xl border px-8 py-10 text-center"
			>
				<div className="bg-brand-yellow flex size-16 items-center justify-center rounded-2xl">
					<Clock aria-hidden className="text-brand-dark size-8" />
				</div>
				<h2 className="font-clash-display text-foreground text-headline-md mt-6 font-semibold">
					Taking longer than usual
				</h2>
				<p className="text-muted-foreground text-body-sm mt-2 max-w-xs">
					The draw is still processing on-chain. This can happen during
					Chainlink network congestion.
				</p>
				{onRefresh ? (
					<Button
						variant="outline"
						onClick={onRefresh}
						className="mt-6 rounded-full"
					>
						<RefreshCw aria-hidden />
						Refresh
					</Button>
				) : null}
			</div>
		);
	}

	// Random sample is rolled server-side per request — distinct page
	// loads see distinct decorative handles. OrbitalCards locks the
	// initial value so the ring stays stable across polling refreshes.
	const participants = buildParticipantSample();

	return (
		<div
			role="status"
			aria-live="polite"
			className="border-border bg-card flex flex-col items-center overflow-hidden rounded-2xl border p-6 text-center"
		>
			{/* Header sits at the top — no longer a centred overlay — so the
			    copy never collides with the orbiting cards below it. */}
			<h2 className="font-clash-display text-foreground text-headline-md font-semibold">
				Drawing winners
			</h2>
			<p className="text-muted-foreground text-body-sm mt-2 max-w-xs">
				Selecting on-chain via Chainlink VRF
			</p>
			<div
				aria-hidden
				className="bg-ink-200 mt-6 h-2 w-32 overflow-hidden rounded-full"
			>
				<div className="bg-brand-dark motion-safe:animate-reveal-progress h-full w-1/3 rounded-full" />
			</div>
			{/* Orbit well — a square query container so the ring sizes itself
			    in container units (`cqi`) and always fits, whatever width the
			    parent card takes. Capped so it doesn't balloon on wide cards. */}
			<div className="@container relative mt-8 aspect-square w-full max-w-(--spacing-reveal-draw-orbit)">
				<OrbitalCards
					participants={participants}
					radius="34cqi"
					cardSize="28cqi"
				/>
			</div>
		</div>
	);
}
