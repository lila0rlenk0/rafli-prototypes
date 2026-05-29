'use client';

import {
	FRAME_ENTRANCE_CLASS,
	STAGE_ENTRANCE_CLASS,
} from '@/components/raffle/motion-classes';
import { cn } from '@/lib/class-names';

/**
 * "Revealing your result" frame — bridges loading and the terminal
 * winner/loser outcome. A yellow card flips on Y-axis (CSS keyframe
 * `reveal-card-flip`) while the orbital ring slows in the background.
 *
 * @returns Centered flipping card + transition copy
 */
export function RevealingFrame() {
	return (
		<div
			className={cn(
				'absolute inset-0 flex flex-col items-center justify-center px-8',
				FRAME_ENTRANCE_CLASS,
			)}
		>
			<div
				aria-hidden
				className="bg-brand-yellow motion-safe:animate-reveal-card-flip size-44 rounded-3xl"
			/>
			<p
				className={cn(
					'text-foreground text-body-sm mt-8 font-medium',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-400',
				)}
			>
				Revealing your result…
			</p>
		</div>
	);
}
