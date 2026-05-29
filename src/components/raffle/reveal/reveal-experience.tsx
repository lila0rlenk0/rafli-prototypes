'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { RaffleInfoCard } from '@/components/raffle/info-card/info-card';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';
import { isPartialParticipation } from '@/lib/utils/raffle/partial-participation';
import type { Raffle, RaffleWinner } from '@/types/raffle';
import type { TicketCode } from '@/types/ticket';
import type { Winning } from '@/types/winning';

import { LoadingFrame } from './loading-frame';
import { LoserFrame } from './loser-frame';
import { OrbitalCards } from './orbital-cards';
import { RevealingFrame } from './revealing-frame';
import {
	buildParticipantSample,
	deriveOutcome,
	isRevealEligible,
	LOADING_MIN_MS,
	REVEALING_MS,
	revealStorageKey,
	type Outcome,
	type RevealState,
} from './reveal-state';
import { WinnerFrame } from './winner-frame';

interface RaffleRevealExperienceProps {
	raffle: Raffle;
	publicSlug: string;
	myWinning: Winning | null;
	myTicketsTotal: number;
	myTicketCodes: TicketCode[];
	myUserName: string | null;
	isAuthenticated: boolean;
	isOwner: boolean;
	isConcluded: boolean;
	hasWinners: boolean;
	isCancelled: boolean;
	/**
	 * Post-reveal content (terminal cards, winners list) gated behind the
	 * reveal for eligible participants and passed straight through for
	 * everyone else.
	 */
	children: ReactNode;
}

/**
 * Reveal experience for concluded raffles — gates the win / loss outcome
 * behind a four-state CSS-keyframe choreography (loading → revealing →
 * winner|loser). Activates only once the raffle has concluded AND winners
 * are selected AND the viewer actually participated; passes `children`
 * straight through for hosts, unrelated guests, and the pre-winner draw
 * window.
 *
 * The first encounter is an in-page intro card ("The winner is in!" + entry
 * stats + a "Reveal the winner" CTA) followed by the Sweepstakes Details
 * card. The animation only opens on click — and always runs in full, even
 * though the winners are already drawn — while the spoiler `children`
 * (terminal cards, winners list) stay hidden until the reveal is taken.
 * A persisted localStorage flag (one entry per raffle id, `revealStorageKey`)
 * records that the viewer saw the animation, so later visits — including new
 * sessions — land straight on the result, with a "Replay" button kept
 * available.
 *
 * @returns The intro/replay surface + gated children + reveal dialog, or the
 * children alone when the viewer is not eligible
 */
export function RaffleRevealExperience({
	raffle,
	publicSlug,
	myWinning,
	myTicketsTotal,
	myTicketCodes,
	myUserName,
	isAuthenticated,
	isOwner,
	isConcluded,
	hasWinners,
	isCancelled,
	children,
}: RaffleRevealExperienceProps) {
	const isParticipant = myTicketsTotal > 0 || myWinning !== null;
	const isEligible = isRevealEligible({
		isConcluded,
		hasWinners,
		isCancelled,
		isOwner,
		isParticipant,
	});

	const outcome = deriveOutcome({ raffle, myWinning, hasWinners });
	const [open, setOpen] = useState(false);
	// `cycleId` keys the dialog child so each open cycle remounts the
	// choreography from `loading`. Avoids a synchronous setState-in-effect
	// reset path and keeps replays deterministic.
	const [cycleId, setCycleId] = useState(0);
	// Gates the spoiler children behind the reveal. Starts false so SSR and
	// the first client render agree; the mount effect promotes it to true
	// when the viewer already saw the reveal on a prior visit (localStorage).
	const [revealed, setRevealed] = useState(false);
	const raffleId = raffle.id;

	// mount: skip the intro when this raffle's reveal was already seen on any
	// prior visit (persisted in localStorage, keyed per raffle id).
	// `setTimeout(0)` keeps the setState off the synchronous effect body
	// (eslint react-hooks/set-state-in-effect) and matches the deferred
	// timer pattern used by raffle-countdown/auto-refresh.tsx.
	useEffect(
		function syncSeenFlag() {
			if (!isEligible) return;
			if (typeof window === 'undefined') return;
			if (window.localStorage.getItem(revealStorageKey(raffleId)) !== '1') {
				return;
			}
			const id = window.setTimeout(function markSeen() {
				setRevealed(true);
			}, 0);
			return function cleanup() {
				window.clearTimeout(id);
			};
		},
		[isEligible, raffleId],
	);

	// Hosts, non-participants, the pre-winner draw window, and active /
	// cancelled raffles never gate — the post-draw content renders through.
	if (!isEligible) return <>{children}</>;

	const isCreditPayout = isPartialParticipation(raffle);
	const firstWinner = raffle.winners?.[0] ?? null;

	function handleReveal() {
		setCycleId(function bump(prev) {
			return prev + 1;
		});
		setOpen(true);
	}

	// Reveal the gated children and persist the seen-flag so the animation
	// isn't forced again on later visits.
	function commitRevealSeen() {
		markRevealSeen(raffleId);
		setRevealed(true);
	}

	function handleCloseReveal() {
		commitRevealSeen();
		setOpen(false);
	}

	return (
		<>
			{revealed ? (
				<>
					<RevealReplayPrompt onReplay={handleReveal} />
					{children}
				</>
			) : (
				<>
					<RevealIntroCard
						myEntries={myTicketsTotal}
						totalEntries={raffle.ticketsSoldCount}
						onReveal={handleReveal}
					/>
					<RaffleInfoCard
						raffle={raffle}
						myTicketCodes={myTicketCodes}
						myTicketsTotal={myTicketsTotal}
						isAuthenticated={isAuthenticated}
						publicSlug={publicSlug}
					/>
				</>
			)}
			<Dialog
				open={open}
				onOpenChange={nextOpen => {
					if (!nextOpen) commitRevealSeen();
					setOpen(nextOpen);
				}}
			>
				<RaffleRevealDialogBody
					key={cycleId}
					outcome={outcome}
					raffle={raffle}
					publicSlug={publicSlug}
					myWinning={myWinning}
					myUserName={myUserName}
					firstWinner={firstWinner}
					isCreditPayout={isCreditPayout}
					onClose={handleCloseReveal}
				/>
			</Dialog>
		</>
	);
}

interface RevealIntroCardProps {
	myEntries: number;
	totalEntries: number;
	onReveal: () => void;
}

/**
 * First-encounter intro for an eligible participant — surfaces the entry
 * stats and the manual "Reveal the winner" trigger before the animation
 * runs, so the draw result never appears unprompted.
 *
 * @returns The green intro card with entry stats and the reveal CTA
 */
export function RevealIntroCard({
	myEntries,
	totalEntries,
	onReveal,
}: RevealIntroCardProps) {
	return (
		<div className="bg-brand-mint flex flex-col items-center rounded-3xl px-6 py-12 text-center">
			<Sparkles aria-hidden className="text-brand-dark size-8" />
			<h2 className="font-clash-display text-foreground text-headline-md mt-4 font-semibold">
				The winner is in!
			</h2>
			<div className="mt-6 flex gap-3">
				<RevealStatTile value={myEntries} label="My entries" />
				<RevealStatTile value={totalEntries} label="Total Entries" />
			</div>
			<Button onClick={onReveal} className="mt-8 w-full max-w-xs">
				Reveal the winner
			</Button>
		</div>
	);
}

interface RevealStatTileProps {
	value: number;
	label: string;
}

/** One bordered entry-count tile inside the intro card. */
function RevealStatTile({ value, label }: RevealStatTileProps) {
	return (
		<div className="border-border bg-card flex min-w-24 flex-col items-center rounded-xl border px-6 py-3">
			<p className="text-foreground text-lg font-semibold">
				{value.toLocaleString('en-US')}
			</p>
			<p className="text-ink-500 text-xs">{label}</p>
		</div>
	);
}

interface RevealReplayPromptProps {
	onReplay: () => void;
}

/** Post-reveal "Replay" affordance shown once the result has been seen. */
function RevealReplayPrompt({ onReplay }: RevealReplayPromptProps) {
	return (
		<div className="border-border bg-card/60 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3">
			<p className="text-muted-foreground text-body-sm">
				Missed the reveal animation?
			</p>
			<Button
				variant="outline"
				size="sm"
				onClick={onReplay}
				data-slot="reveal-replay-trigger"
			>
				<Sparkles aria-hidden />
				Replay
			</Button>
		</div>
	);
}

interface RaffleRevealDialogBodyProps {
	outcome: Outcome;
	raffle: Raffle;
	publicSlug: string;
	myWinning: Winning | null;
	myUserName: string | null;
	firstWinner: RaffleWinner | null;
	isCreditPayout: boolean;
	onClose: () => void;
	// Demo override for the card-flip dwell — `RevealDemoLink` slows it
	// down so the preview is easier to inspect. The loading dwell is
	// fixed at `LOADING_MIN_MS` because the demo simulates the pending
	// wait via outcome state instead of overriding the floor.
	revealingMs?: number;
}

/**
 * Inner dialog content — runs the loading → revealing → terminal state
 * machine. Mounts inside `Dialog` so Radix only constructs it while the
 * dialog is open; remount on the `cycleId` key resets the machine to
 * `loading` for each replay.
 *
 * Exported so `RevealDemoLink` can replay the same choreography against
 * any raffle for a forced-outcome preview, without duplicating the state
 * machine.
 *
 * @returns The state-driven dialog content
 */
export function RaffleRevealDialogBody({
	outcome,
	raffle,
	publicSlug,
	myWinning,
	myUserName,
	firstWinner,
	isCreditPayout,
	onClose,
	revealingMs = REVEALING_MS,
}: RaffleRevealDialogBodyProps) {
	const [state, setState] = useState<RevealState>('loading');
	// Anchor the loading-dwell timer on body mount, not on outcome
	// resolution. The orbit must keep spinning until winners data lands
	// (outcome leaves 'pending'); the minimum dwell only kicks in when
	// the user mounts an already-resolved raffle, so the frame stays
	// visible for at least `loadingMs` from mount, never additive on
	// top of the pending wait.
	const [mountTime] = useState(function captureMountTime() {
		return Date.now();
	});

	// Random sample is generated once per dialog mount; each replay
	// remounts (cycleId key) and rolls a fresh set. `OrbitalCards`
	// further locks the value via useState so re-renders inside the
	// open dialog never reshuffle the ring.
	const participants = useMemo(function sampleParticipants() {
		return buildParticipantSample();
	}, []);

	// loading → revealing transition. The orbit spins indefinitely while
	// `outcome === 'pending'` (parent polling refreshes the prop). Once
	// winners land, transition immediately if the minimum dwell from mount
	// has already elapsed; otherwise wait out the remainder.
	useEffect(
		function scheduleRevealingTransition() {
			if (state !== 'loading') return;
			if (outcome === 'pending') return;
			const elapsed = Date.now() - mountTime;
			const remaining = Math.max(0, LOADING_MIN_MS - elapsed);
			const loadingId = window.setTimeout(function toRevealing() {
				setState('revealing');
			}, remaining);
			return function cleanup() {
				window.clearTimeout(loadingId);
			};
		},
		[state, outcome, mountTime],
	);

	// revealing → outcome transition. Outcome may still be pending when this
	// effect first runs (raffle just transitioned past `ended`), so we guard
	// before committing the terminal state.
	useEffect(
		function scheduleOutcomeTransition() {
			if (state !== 'revealing') return;
			const revealId = window.setTimeout(function toOutcome() {
				if (outcome === 'winner' || outcome === 'loser') {
					setState(outcome);
				}
			}, revealingMs);
			return function cleanup() {
				window.clearTimeout(revealId);
			};
		},
		[state, outcome, revealingMs],
	);

	return (
		<DialogContent className="bg-background h-(--spacing-full-screen) max-w-lg overflow-hidden border-0 p-0 sm:h-(--spacing-reveal-modal) sm:rounded-3xl">
			<DialogTitle className="sr-only">
				{getDialogTitleCopy(outcome)}
			</DialogTitle>
			<DialogDescription className="sr-only">{raffle.title}</DialogDescription>
			<div className="relative h-full w-full overflow-hidden">
				{/* Orbit only rides the draw phase — once a winner has been
				    selected and the terminal frame takes over, the ring is
				    unmounted so the celebration content (or loser copy) sits
				    on a clean background. */}
				{state === 'loading' || state === 'revealing' ? (
					<OrbitalCards
						participants={participants}
						isRevealing={state === 'revealing'}
					/>
				) : null}
				{state === 'loading' ? (
					<LoadingFrame raffleTitle={raffle.title} />
				) : null}
				{state === 'revealing' ? <RevealingFrame /> : null}
				{state === 'winner' ? (
					<WinnerFrame
						raffle={raffle}
						myWinning={myWinning}
						myUserName={myUserName}
						isCreditPayout={isCreditPayout}
						onClose={onClose}
					/>
				) : null}
				{state === 'loser' ? (
					<LoserFrame
						publicSlug={publicSlug}
						firstWinner={firstWinner}
						onClose={onClose}
					/>
				) : null}
			</div>
		</DialogContent>
	);
}

/**
 * Title copy for the SR-only `DialogTitle`. Mirrors the visible heading
 * per outcome so assistive tech announces the same intent visible users get.
 *
 * @returns Heading text for the current outcome
 */
function getDialogTitleCopy(outcome: Outcome): string {
	if (outcome === 'winner') return 'You won the sweepstakes';
	if (outcome === 'loser') return 'Sweepstakes results revealed';
	return 'Revealing sweepstakes results';
}

// Records the per-raffle "saw the animation" flag in localStorage so it
// survives across sessions — a returning visitor skips the full reveal and
// lands on the result (with Replay still available).
function markRevealSeen(raffleId: string) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(revealStorageKey(raffleId), '1');
}
