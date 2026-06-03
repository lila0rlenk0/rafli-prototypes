import type { CSSProperties } from 'react';

import { cn } from '@/lib/class-names';

/**
 * Animated page background — brand-coloured squares that fly across the
 * screen, rotating as they drift and fading in/out so each loop seams
 * cleanly. The playful motion echoes the games' neo-brutalist energy without
 * competing with content (opacity caps low; everything sits on a `-z-10`
 * underlay).
 *
 * Purely decorative: `aria-hidden`, `pointer-events-none`. Placement, size,
 * and timing are derived deterministically from the index (no `Math.random`)
 * so the server and client render identical markup — random values would
 * desync on hydration. Each block is assigned one of six `hg-block-fly-*`
 * motion lanes (globals.css), all of which honour `prefers-reduced-motion`.
 *
 * @returns The full-bleed animated block layer
 */
const BLOCK_COLORS = [
	'bg-brand-yellow',
	'bg-brand-mint',
	'bg-brand-sky',
	'bg-brand-green',
] as const;

/** Count of distinct `hg-block-fly-{n}` motion lanes defined in globals.css. */
const LANE_COUNT = 6;
const BLOCK_COUNT = 18;

interface Block {
	readonly left: number;
	readonly top: number;
	readonly size: number;
	readonly colorClass: string;
	readonly lane: number;
	readonly delay: number;
	readonly dur: number;
}

/** Deterministic pseudo-scatter from the index — stable across SSR/hydration. */
const BLOCKS: readonly Block[] = Array.from(
	{ length: BLOCK_COUNT },
	(_, i) => ({
		left: (i * 89) % 100,
		top: (i * 47) % 100,
		size: 26 + (i % 5) * 12,
		colorClass: BLOCK_COLORS[i % BLOCK_COLORS.length],
		lane: (i % LANE_COUNT) + 1,
		delay: (i % 9) * 0.7,
		dur: 11 + (i % 7),
	}),
);

export function FloatingBlocks() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
		>
			{BLOCKS.map((block, i) => {
				const style: CSSProperties = {
					left: `${block.left}%`,
					top: `${block.top}%`,
					width: block.size,
					height: block.size,
					animationDelay: `${block.delay}s`,
					animationDuration: `${block.dur}s`,
				};
				return (
					<div
						key={i}
						className={cn(
							'hg-block absolute rounded-2xl',
							block.colorClass,
							`hg-block-fly-${block.lane}`,
						)}
						style={style}
					/>
				);
			})}
		</div>
	);
}
