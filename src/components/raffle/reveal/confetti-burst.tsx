'use client';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/class-names';

import {
	ACCENT_CARD_CLASSES,
	CONFETTI_PIECES,
	CONFETTI_SPREAD_MS,
} from './reveal-state';

interface ConfettiPieceProps {
	index: number;
}

/**
 * Single deterministic confetti piece. Offsets are keyed by `index` so SSR and
 * CSR hydrate the same layout — Math.random() at render would trip React 19's
 * hydration mismatch guard.
 *
 * @returns A single animated confetti span.
 */
function ConfettiPiece({ index }: ConfettiPieceProps) {
	const itemDelayMs = (index / CONFETTI_PIECES) * CONFETTI_SPREAD_MS;
	const hash = (index * 9301 + 49297) % 233_280;
	const horizontalStart = (hash / 233_280) * 100;
	const horizontalDriftPx = ((hash * 13) % 200) - 100;
	const rotationDeg = ((hash * 17) % 720) - 360;
	const colorClass = ACCENT_CARD_CLASSES[index % ACCENT_CARD_CLASSES.length];
	// Inline style hosts the deterministic per-piece geometry — `left` is
	// the random horizontal start, CSS vars (--cf-x / --cf-r / --cf-delay)
	// feed `reveal-confetti-fall`. The fixed -5% top offset is a class
	// (arbitrary syntax) because it's identical across every piece.
	const pieceStyle: CSSProperties = {
		left: `${horizontalStart}%`,
		'--cf-x': `${horizontalDriftPx}px`,
		'--cf-r': `${rotationDeg}deg`,
		'--cf-delay': `${itemDelayMs}ms`,
	} as CSSProperties;
	return (
		<span
			style={pieceStyle}
			className={cn(
				'motion-safe:animate-reveal-confetti absolute top-[-5%] block size-3 rounded-xs opacity-0',
				colorClass,
			)}
		/>
	);
}

/**
 * Full-burst confetti overlay for the winner frame. Renders CONFETTI_PIECES
 * individual pieces with deterministic trajectories so hydration is stable.
 *
 * @returns Absolutely-positioned confetti container.
 */
export function ConfettiBurst() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 overflow-visible"
		>
			{Array.from({ length: CONFETTI_PIECES }).map((_, index) => (
				<ConfettiPiece key={index} index={index} />
			))}
		</div>
	);
}
