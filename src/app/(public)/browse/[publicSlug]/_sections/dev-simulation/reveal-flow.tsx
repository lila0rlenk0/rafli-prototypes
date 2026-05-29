'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { RaffleDrawCard } from '@/components/raffle/cards/draw-card';
import { RaffleInfoCard } from '@/components/raffle/info-card/info-card';
import { RevealIntroCard } from '@/components/raffle/reveal/reveal-experience';
import type { Raffle } from '@/types/raffle';
import type { TicketCode } from '@/types/ticket';

// How long the inline "Drawing winners" animation plays before the result
// surfaces. Distinct from the production modal's dwell — the simulator
// previews a fixed 10s in-page draw rather than the VRF-gated wait.
const SIM_REVEAL_DRAW_MS = 10_000;

// The simulator has no real entries to list inside the intro's details card.
const SIM_MY_TICKET_CODES: TicketCode[] = [];

type SimRevealState = 'intro' | 'drawing' | 'result';

interface SimulationRevealFlowProps {
	raffle: Raffle;
	publicSlug: string;
	myTicketsTotal: number;
	/** The resting result card (won / not-won) shown after the animation. */
	children: ReactNode;
}

/**
 * Inline (no-modal) reveal preview for the simulator's `reveal-win` /
 * `reveal-lose` phases. Mirrors the production first-encounter — green intro
 * card + Sweepstakes Details — but on "Reveal the winner" it swaps the column
 * to the phase-B "Drawing winners" animation for 10s, then reveals the result
 * card, all in-page instead of opening the production reveal dialog.
 *
 * @returns The current stage of the inline reveal preview
 */
export function SimulationRevealFlow({
	raffle,
	publicSlug,
	myTicketsTotal,
	children,
}: SimulationRevealFlowProps) {
	const [state, setState] = useState<SimRevealState>('intro');

	// Holds the drawing animation for a fixed window, then surfaces the
	// result — the simulator's stand-in for the backend draw resolving.
	useEffect(
		function advancePastDrawing() {
			if (state !== 'drawing') return;
			const id = window.setTimeout(function toResult() {
				setState('result');
			}, SIM_REVEAL_DRAW_MS);
			return function cleanup() {
				window.clearTimeout(id);
			};
		},
		[state],
	);

	if (state === 'result') return <>{children}</>;

	if (state === 'drawing') return <RaffleDrawCard />;

	return (
		<>
			<RevealIntroCard
				myEntries={myTicketsTotal}
				totalEntries={raffle.ticketsSoldCount}
				onReveal={function startDrawing() {
					setState('drawing');
				}}
			/>
			<RaffleInfoCard
				raffle={raffle}
				myTicketCodes={SIM_MY_TICKET_CODES}
				myTicketsTotal={myTicketsTotal}
				isAuthenticated
				publicSlug={publicSlug}
			/>
		</>
	);
}
