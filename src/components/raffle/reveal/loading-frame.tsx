'use client';

import {
	FRAME_ENTRANCE_CLASS,
	STAGE_ENTRANCE_CLASS,
} from '@/components/raffle/motion-classes';
import { cn } from '@/lib/class-names';

interface LoadingFrameProps {
	raffleTitle: string;
}

/**
 * "Drawing winners" frame — appears while the backend is selecting via
 * Chainlink VRF. Static copy with a sliding progress bar; orbital cards
 * are rendered separately as a sibling so the same ring carries through
 * into the revealing frame without re-mount jitter.
 *
 * @returns Centered loading copy + animated progress bar
 */
export function LoadingFrame({ raffleTitle }: LoadingFrameProps) {
	return (
		<div
			className={cn(
				'absolute inset-0 flex flex-col items-center justify-center px-8',
				FRAME_ENTRANCE_CLASS,
			)}
		>
			<p
				className={cn(
					'text-ink-500 text-2xs tracking-caps-3 max-w-xs truncate uppercase',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-100',
				)}
			>
				{raffleTitle}
			</p>
			<p
				className={cn(
					'font-clash-display text-foreground text-headline-md mt-3 text-center font-semibold',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-200',
				)}
			>
				Drawing winners
			</p>
			<p
				className={cn(
					'text-ink-500 text-body-sm mt-2 text-center',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-300',
				)}
			>
				Selecting on-chain via Chainlink VRF
			</p>
			<div
				className={cn(
					'bg-ink-200 mt-8 h-2 w-44 overflow-hidden rounded-full',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-400',
				)}
			>
				<div className="bg-brand-dark motion-safe:animate-reveal-progress h-full w-1/3 rounded-full" />
			</div>
		</div>
	);
}
