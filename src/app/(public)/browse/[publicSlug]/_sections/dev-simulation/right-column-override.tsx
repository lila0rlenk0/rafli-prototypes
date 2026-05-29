'use client';

import { type ReactNode } from 'react';

import { RaffleDrawCard } from '@/components/raffle/cards/draw-card';
import { RaffleNotWonCard } from '@/components/raffle/cards/not-won-card';
import { RaffleWonCard } from '@/components/raffle/cards/won-card';
import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';

import { applyPhaseToRaffle, SIM_PHASE } from './phases';
import { SimulationRevealFlow } from './reveal-flow';
import { useRaffleSimulation } from './store';

interface SimulationRightColumnOverrideProps {
	raffle: Raffle;
	publicSlug: string;
	myUserName: string | null;
	children: ReactNode;
}

// Synthetic copy reused across simulator branches — kept here (not in
// phases.ts) so the data layer stays Raffle-shape only and presentational
// strings live with the consumer that renders them.
const SIM_WINNER_TICKET = 'SIM-0001';
// Simulated viewer's entry count — backs the not-won card's tally and the
// "My entries" stat in the reveal intro.
const SIM_MY_TICKETS = 1;

/**
 * Replaces the right-column user slot with a phase-driven surface so the
 * developer can preview the page's actual end state. Real children render
 * passthrough on `idle`; on any other phase the override swaps in the
 * matching production card. The `winner` / `loser` phases show the resting
 * result card directly, while `reveal-win` / `reveal-lose` run the in-page
 * first-encounter flow (green intro → "Drawing winners" animation → result)
 * via `SimulationRevealFlow` — no modal.
 *
 * @returns Children when idle, phase-specific surface otherwise
 */
export function SimulationRightColumnOverride({
	raffle,
	publicSlug,
	myUserName,
	children,
}: SimulationRightColumnOverrideProps) {
	const { phase } = useRaffleSimulation();

	if (phase === SIM_PHASE.IDLE) return <>{children}</>;

	if (
		phase === SIM_PHASE.EXPIRED ||
		phase === SIM_PHASE.DRAWING ||
		phase === SIM_PHASE.FULFILLING
	) {
		return <RaffleDrawCard />;
	}

	if (phase === SIM_PHASE.WINNER) {
		return (
			<RaffleWonCard
				userName={myUserName ?? 'Winner'}
				ticketCode={SIM_WINNER_TICKET}
			/>
		);
	}

	if (phase === SIM_PHASE.LOSER) {
		return (
			<RaffleNotWonCard
				status={RAFFLE_STATUS.COMPLETED}
				publicSlug={publicSlug}
				myTicketsTotal={SIM_MY_TICKETS}
			/>
		);
	}

	// Reveal phases preview the in-page first-encounter flow: green intro →
	// "Drawing winners" animation (10s) → result card. No modal — the
	// SimulationRevealFlow drives the column inline.
	if (phase === SIM_PHASE.REVEAL_WIN) {
		return (
			<SimulationRevealFlow
				raffle={applyPhaseToRaffle(raffle, SIM_PHASE.REVEAL_WIN)}
				publicSlug={publicSlug}
				myTicketsTotal={SIM_MY_TICKETS}
			>
				<RaffleWonCard
					userName={myUserName ?? 'Winner'}
					ticketCode={SIM_WINNER_TICKET}
				/>
			</SimulationRevealFlow>
		);
	}

	if (phase === SIM_PHASE.REVEAL_LOSE) {
		return (
			<SimulationRevealFlow
				raffle={applyPhaseToRaffle(raffle, SIM_PHASE.REVEAL_LOSE)}
				publicSlug={publicSlug}
				myTicketsTotal={SIM_MY_TICKETS}
			>
				<RaffleNotWonCard
					status={RAFFLE_STATUS.COMPLETED}
					publicSlug={publicSlug}
					myTicketsTotal={SIM_MY_TICKETS}
				/>
			</SimulationRevealFlow>
		);
	}

	const exhaustiveCheck: never = phase;
	return exhaustiveCheck;
}
