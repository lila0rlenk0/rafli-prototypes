'use client';

import { useEffect, useState } from 'react';

import { Dialog } from '@/components/ui/dialog';
import type { Raffle } from '@/types/raffle';

import { RaffleRevealDialogBody } from './reveal-experience';
import type { Outcome } from './reveal-state';

// Simulated "drawing" wait — how long the demo holds in `outcome:
// 'pending'` so the orbital cards keep rotating like they do in the
// live flow while the backend is still selecting winners. 18s = three
// full rotations of the 6s orbit period in globals.css, so the preview
// clearly demonstrates the "multiple orbits during the draw" intent.
const DEMO_DRAWING_MS = 18_000;
const DEMO_REVEALING_MS = 2_400;

interface RevealDemoLinkProps {
	raffle: Raffle;
	publicSlug: string;
}

/**
 * Tiny preview link that replays the winner-picking choreography
 * (loading → revealing → winner) against any raffle — including active
 * ones — so the team can sanity-check the reveal animation without
 * waiting for the actual draw to settle. Simulates the backend draw by
 * holding `outcome: 'pending'` for `DEMO_DRAWING_MS`, then flipping to
 * `winner` so the body exercises the same "spin until winners arrive"
 * path the live flow uses.
 *
 * @returns Muted link button + reveal dialog seeded with a simulated draw
 */
export function RevealDemoLink({ raffle, publicSlug }: RevealDemoLinkProps) {
	const [open, setOpen] = useState(false);
	// `cycleId` keys the body so each click remounts the state machine
	// from `loading`, matching the replay behaviour of the live reveal.
	const [cycleId, setCycleId] = useState(0);
	const [outcome, setOutcome] = useState<Outcome>('pending');

	function handleClick() {
		setOutcome('pending');
		setCycleId(function bump(prev) {
			return prev + 1;
		});
		setOpen(true);
	}

	function handleClose() {
		setOpen(false);
	}

	// Holds the dialog in `pending` so the orbit keeps spinning, then
	// resolves to `winner` after the simulated draw window — matches the
	// live flow's "outcome lands via polling" trigger. Re-runs on each
	// replay because `cycleId` is in the deps.
	useEffect(
		function simulateWinnersArrival() {
			if (!open) return;
			if (outcome !== 'pending') return;
			const id = window.setTimeout(function resolveWinner() {
				setOutcome('winner');
			}, DEMO_DRAWING_MS);
			return function cleanup() {
				window.clearTimeout(id);
			};
		},
		[open, outcome, cycleId],
	);

	return (
		<>
			<button
				type="button"
				onClick={handleClick}
				className="text-muted-foreground hover:text-foreground focus-visible:ring-ring text-label-sm mt-3 block w-full rounded text-center underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
			>
				Preview winner reveal animation
			</button>
			<Dialog open={open} onOpenChange={setOpen}>
				<RaffleRevealDialogBody
					key={cycleId}
					outcome={outcome}
					raffle={raffle}
					publicSlug={publicSlug}
					myWinning={null}
					myUserName={null}
					firstWinner={null}
					isCreditPayout={false}
					onClose={handleClose}
					revealingMs={DEMO_REVEALING_MS}
				/>
			</Dialog>
		</>
	);
}
