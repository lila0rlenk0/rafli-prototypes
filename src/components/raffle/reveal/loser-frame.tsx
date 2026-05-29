'use client';

import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { FaXTwitter } from 'react-icons/fa6';

import {
	FRAME_ENTRANCE_CLASS,
	STAGE_ENTRANCE_CLASS,
} from '@/components/raffle/motion-classes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';
import type { RaffleWinner } from '@/types/raffle';

import { resolveWinnerLabel } from './reveal-state';

const LOSER_SHAKE_STYLE: CSSProperties = {
	'--card-shake-deg': '3deg',
} as CSSProperties;

interface LoserFrameProps {
	publicSlug: string;
	firstWinner: RaffleWinner | null;
	onClose: () => void;
}

/**
 * Terminal "Better luck next time" frame. Surfaces the winning entrant's
 * name on a dark card with a gentle shake, then offers a share-for-free-
 * entry path or a browse-more fallback.
 *
 * @returns Loser frame with share + browse CTAs
 */
export function LoserFrame({
	publicSlug,
	firstWinner,
	onClose,
}: LoserFrameProps) {
	const router = useRouter();
	const winnerLabel = resolveWinnerLabel(firstWinner);
	function handleBrowse() {
		router.push('/browse');
		onClose();
	}
	function handleShare() {
		if (typeof window === 'undefined') return;
		const link = `${window.location.origin}/browse/${publicSlug}`;
		const text = `Free entry on @rafli_win — join me: ${link}`;
		const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
		window.open(intent, '_blank', 'noopener,noreferrer');
	}
	return (
		<div
			className={cn(
				'absolute inset-0 flex flex-col items-center justify-center px-8 text-center',
				FRAME_ENTRANCE_CLASS,
			)}
		>
			<div
				aria-hidden
				style={LOSER_SHAKE_STYLE}
				className="bg-brand-dark text-on-dark motion-safe:animate-card-pop text-body-md flex size-44 items-center justify-center rounded-3xl px-6 font-semibold"
			>
				<span className="line-clamp-3 break-words">{winnerLabel}</span>
			</div>
			<h2
				className={cn(
					'font-clash-display text-foreground text-headline-md mt-6 font-semibold',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-400',
				)}
			>
				Better luck next time
			</h2>
			<p
				className={cn(
					'text-ink-500 text-body-sm mt-2 max-w-sm',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-500',
				)}
			>
				Sorry you didn&apos;t win this time, participate in the other exciting
				raffles.
			</p>
			<div
				className={cn(
					'mt-8 flex w-full flex-col gap-3 sm:max-w-xs',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-700',
				)}
			>
				<Button onClick={handleShare}>
					<FaXTwitter aria-hidden />
					Share for a free entry
				</Button>
				<Button variant="outline" onClick={handleBrowse}>
					Browse more sweepstakes
				</Button>
			</div>
		</div>
	);
}
