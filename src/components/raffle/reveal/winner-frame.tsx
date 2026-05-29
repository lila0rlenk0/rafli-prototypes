'use client';

import type { CSSProperties } from 'react';
import { FaXTwitter } from 'react-icons/fa6';

import {
	FRAME_ENTRANCE_CLASS,
	STAGE_ENTRANCE_CLASS,
} from '@/components/raffle/motion-classes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';
import { formatWinnerPosition } from '@/lib/utils/raffle/winner-position';
import type { Raffle } from '@/types/raffle';
import type { Winning } from '@/types/winning';

import { ConfettiBurst } from './confetti-burst';

const WINNER_SHAKE_STYLE: CSSProperties = {
	'--card-shake-deg': '5deg',
} as CSSProperties;

interface WinnerFrameProps {
	raffle: Raffle;
	myWinning: Winning | null;
	myUserName: string | null;
	isCreditPayout: boolean;
	onClose: () => void;
}

/**
 * Terminal "You won!" frame — confetti burst, celebratory card, position
 * meta, and the claim / share CTA pair. `onClose` dismisses the dialog so
 * the user can interact with the claim panel rendered below the reveal.
 *
 * @returns Winner celebration frame
 */
export function WinnerFrame({
	raffle,
	myWinning,
	myUserName,
	isCreditPayout,
	onClose,
}: WinnerFrameProps) {
	const subtitle = isCreditPayout
		? 'Your Rafli credit payout is ready to view below.'
		: 'Congrats! Claim your prize from the panel below.';
	// Backend `position` is 0-indexed and is omitted entirely for single-winner
	// draws — there is no ranking to show when there is only one winner.
	const positionLabel =
		myWinning !== null
			? formatWinnerPosition(myWinning.position, raffle.numberOfWinners)
			: null;
	const metaParts = [positionLabel, myUserName].filter(Boolean);
	const meta =
		metaParts.length > 0
			? metaParts.join(' · ')
			: 'Welcome to the winners circle';
	return (
		<div
			className={cn(
				'absolute inset-0 flex flex-col items-center justify-center px-8 text-center',
				FRAME_ENTRANCE_CLASS,
			)}
		>
			<ConfettiBurst />
			<div
				aria-hidden
				style={WINNER_SHAKE_STYLE}
				className="bg-brand-yellow motion-safe:animate-card-pop flex size-44 items-center justify-center rounded-3xl text-6xl"
			>
				🎉
			</div>
			<h2
				className={cn(
					'font-clash-display text-foreground text-headline-md mt-6 font-semibold',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-400',
				)}
			>
				You won!
			</h2>
			<p
				className={cn(
					'text-ink-500 text-body-sm mt-2 max-w-sm',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-500',
				)}
			>
				{subtitle}
			</p>
			<p
				className={cn(
					'text-ink-500 text-label-sm mt-1',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-600',
				)}
			>
				{meta}
			</p>
			<div
				className={cn(
					'mt-8 flex w-full flex-col gap-3 sm:max-w-xs',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-700',
				)}
			>
				<Button onClick={onClose}>
					{isCreditPayout ? 'View credit payout' : 'Claim my prize'}
				</Button>
				<ShareWinButton raffle={raffle} />
			</div>
		</div>
	);
}

interface ShareWinButtonProps {
	raffle: Raffle;
}

/**
 * Twitter/X share CTA on the winner frame — opens an intent URL prefilled
 * with the raffle title and link. SSR-safe (no-op if `window` undefined).
 *
 * @returns Outline button that opens the X share intent
 */
function ShareWinButton({ raffle }: ShareWinButtonProps) {
	function handleShare() {
		if (typeof window === 'undefined') return;
		const link = `${window.location.origin}/browse/${raffle.publicSlugOrCode}`;
		const text = `I just won ${raffle.title} on @rafli_win! ${link}`;
		const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
		window.open(intent, '_blank', 'noopener,noreferrer');
	}
	return (
		<Button type="button" variant="outline" onClick={handleShare}>
			<FaXTwitter aria-hidden />
			Share your win
		</Button>
	);
}
