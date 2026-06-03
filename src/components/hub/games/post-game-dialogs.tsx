import { Coins, PartyPopper } from 'lucide-react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import {
	STREAK_COMPLETE_TITLE,
	STREAK_FINALE_CREDITS,
	STREAK_LENGTH,
	type StreakMilestone,
} from '../hub-content';
import type { GameOutcome } from './games-content';

/** Shared neo-brutalist dialog shell — white card, 2px ink border. */
const PANEL_CLASS =
	'border-brand-dark gap-0 border-2 bg-white p-0 max-sm:border-0 sm:rounded-2xl';

interface GameResultDialogProps {
	/** The finished game's outcome, or null while no result is pending. */
	readonly outcome: GameOutcome | null;
	/** Title of the game that was played (drives the eyebrow). */
	readonly gameTitle: string;
	/** Advance to the streak-completion modal. */
	readonly onContinue: () => void;
}

/**
 * Post-game result modal. Pops the moment a game resolves, summarising what
 * the player won (or didn't) before the streak-completion modal takes over.
 * Dismissing it — button, overlay, or Escape — advances the flow, since
 * playing already completed today's check-in.
 *
 * @param outcome - The resolved game outcome (open when non-null)
 * @param gameTitle - Played game's title for the eyebrow
 * @param onContinue - Proceed to the streak modal
 * @returns The result dialog
 */
export function GameResultDialog({
	outcome,
	gameTitle,
	onContinue,
}: GameResultDialogProps) {
	const won = outcome?.won ?? false;
	const award = outcome?.award ?? 0;
	return (
		<Dialog
			open={outcome !== null}
			onOpenChange={nextOpen => {
				if (!nextOpen) {
					onContinue();
				}
			}}
		>
			<DialogContent className={cn(PANEL_CLASS, 'sm:max-w-md')}>
				<div className="flex flex-col items-center gap-4 px-8 pt-10 pb-6 text-center">
					<span
						className={cn(
							'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase',
							won ? 'bg-brand-yellow text-ink-900' : 'bg-ink-150 text-ink-600',
						)}
					>
						{gameTitle}
					</span>
					<DialogTitle className="font-clash-display text-ink-900 text-3xl font-semibold">
						{won ? 'Nice play!' : 'Better luck next time'}
					</DialogTitle>
					<DialogDescription className="text-ink-600 text-body-md max-w-xs">
						{resultBody({ won, award })}
					</DialogDescription>
					{award > 0 ? (
						<span className="bg-brand-mint border-brand-dark inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-lg font-semibold">
							<Coins className="size-5" />+{award} credits
						</span>
					) : null}
				</div>
				<DialogFooter className="px-8 pb-8">
					<Button
						type="button"
						size="lg"
						className="w-full"
						onClick={onContinue}
					>
						Continue
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** Result body copy — keyed off win + whether any credits landed. */
function resultBody({ won, award }: GameOutcome): string {
	if (won && award > 0) {
		return `${award} ${award === 1 ? 'credit' : 'credits'} added to your balance.`;
	}
	if (won) {
		return 'No bonus credits this round — but your daily streak still counts.';
	}
	return 'No win this round, but your daily streak still counts. See you tomorrow.';
}

interface StreakDotsProps {
	/** How many days are complete (1-based day just finished). */
	readonly completed: number;
}

/** A 7-dot progress strip; days up to `completed` read as filled. */
function StreakDots({ completed }: StreakDotsProps) {
	const days = Array.from({ length: STREAK_LENGTH }, (_, index) => index + 1);
	return (
		<ul className="flex items-center justify-center gap-2">
			{days.map(day => (
				<li
					key={day}
					className={cn(
						'size-3 rounded-full border-2',
						day <= completed
							? 'bg-brand-yellow border-brand-dark'
							: 'bg-ink-150 border-black/10',
					)}
				/>
			))}
		</ul>
	);
}

interface StreakCompleteDialogProps {
	/** The milestone for the day just completed, or null while hidden. */
	readonly milestone: StreakMilestone | null;
	/** Close the modal (and, on the finale, bank the bonus credits). */
	readonly onDone: () => void;
}

/**
 * Daily-streak completion modal. Shown after the result modal, it celebrates
 * the day just completed with a per-day milestone message; the seventh day is
 * the finale that awards the bonus credits.
 *
 * @param milestone - The completed day's milestone (open when non-null)
 * @param onDone - Dismiss the modal
 * @returns The streak-completion dialog
 */
export function StreakCompleteDialog({
	milestone,
	onDone,
}: StreakCompleteDialogProps) {
	const isFinale = milestone?.isFinale ?? false;
	return (
		<Dialog
			open={milestone !== null}
			onOpenChange={nextOpen => {
				if (!nextOpen) {
					onDone();
				}
			}}
		>
			<DialogContent className={cn(PANEL_CLASS, 'sm:max-w-md')}>
				{milestone ? (
					<>
						<DialogHeader className="items-center gap-4 px-8 pt-10 text-center">
							<span className="bg-brand-dark inline-flex size-14 items-center justify-center rounded-full text-white">
								<PartyPopper className="size-7" />
							</span>
							<DialogTitle className="font-clash-display text-ink-900 text-2xl font-semibold">
								{STREAK_COMPLETE_TITLE}
							</DialogTitle>
							<DialogDescription className="sr-only">
								Day {milestone.day} of {STREAK_LENGTH} complete.
							</DialogDescription>
						</DialogHeader>
						<div className="flex flex-col items-center gap-4 px-8 pt-5 pb-6 text-center">
							<StreakDots completed={milestone.day} />
							<p className="text-ink-500 text-label-sm font-semibold tracking-wider uppercase">
								Day {milestone.day} of {STREAK_LENGTH}
							</p>
							<p className="font-clash-display text-ink-900 text-3xl font-semibold">
								{milestone.headline}
							</p>
							<p className="text-ink-600 text-body-md max-w-xs">
								{milestone.body}
							</p>
						</div>
						<DialogFooter className="px-8 pb-8">
							<Button
								type="button"
								size="lg"
								className="w-full"
								onClick={onDone}
							>
								{isFinale
									? `Claim ${STREAK_FINALE_CREDITS} credits`
									: 'Keep it up'}
							</Button>
						</DialogFooter>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
