'use client';

import { useState, type CSSProperties } from 'react';

import { cn } from '@/lib/class-names';

import type { ConfirmationTier } from './tier';

interface TierSquaresProps {
	readonly show: boolean;
	readonly tier: ConfirmationTier;
}

interface Square {
	readonly id: number;
	readonly leftPercent: number;
	readonly topPercent: number;
	readonly sizePx: number;
	readonly radiusPx: number;
	readonly delayMs: number;
	readonly durationMs: number;
	readonly xDriftPx: number;
	readonly yDriftPx: number;
	readonly rotateDeg: number;
	readonly colorClass: string;
}

const PALETTE = ['bg-brand-mint', 'bg-brand-sky', 'bg-brand-yellow'] as const;

interface TierBlueprint {
	readonly count: number;
	readonly staggerMs: number;
	readonly sizeMinPx: number;
	readonly sizeMaxPx: number;
}

const TIER_BLUEPRINTS: Record<ConfirmationTier, TierBlueprint> = {
	TIER1: { count: 12, staggerMs: 50, sizeMinPx: 40, sizeMaxPx: 70 },
	TIER2: { count: 30, staggerMs: 30, sizeMinPx: 50, sizeMaxPx: 90 },
	TIER3: { count: 60, staggerMs: 20, sizeMinPx: 60, sizeMaxPx: 120 },
};

const DRIFT_RANGE_PX = 200;
const ROTATE_RANGE_DEG = 360;
const DURATION_BASE_MS = 2_000;
const DURATION_JITTER_MS = 2_000;
const RADIUS_BASE_PX = 8;
const RADIUS_RANGE_PX = 8;

function buildSquares(blueprint: TierBlueprint): readonly Square[] {
	const { count, staggerMs, sizeMinPx, sizeMaxPx } = blueprint;
	const sizeRange = sizeMaxPx - sizeMinPx;
	return Array.from({ length: count }, function build(_, i): Square {
		const sizePx = sizeMinPx + Math.random() * sizeRange;
		const radiusPx = RADIUS_BASE_PX + (sizePx / sizeMaxPx) * RADIUS_RANGE_PX;
		return {
			id: i,
			leftPercent: Math.random() * 100,
			topPercent: Math.random() * 100,
			sizePx,
			radiusPx,
			delayMs: i * staggerMs,
			durationMs: DURATION_BASE_MS + Math.random() * DURATION_JITTER_MS,
			xDriftPx: (Math.random() - 0.5) * DRIFT_RANGE_PX,
			yDriftPx: (Math.random() - 0.5) * DRIFT_RANGE_PX,
			rotateDeg: Math.random() * ROTATE_RANGE_DEG - ROTATE_RANGE_DEG / 2,
			colorClass: PALETTE[i % PALETTE.length],
		};
	});
}

/**
 * Tiered ambient background — scatters 12 / 30 / 60 brand-color squares
 * across the confirmation modal, pulses each in with a back-out spring
 * and drifts it off-screen. Square density and size range grow with the
 * tier so a larger entry purchase reads as a richer celebration.
 *
 * Per-square `--ts-x` / `--ts-y` / `--ts-r` + `animationDuration` +
 * `animationDelay` ride inline `style` — these are runtime random
 * values, not theme tokens, so they can't be expressed via utilities.
 * Decorative motion is `motion-safe:` gated per `.claude/rules/motion.md`.
 *
 * Mounts only when `show` is true so each modal open replays with
 * fresh randomized trajectories.
 *
 * @returns Cluster of absolutely-positioned animated squares — sized
 *   and counted per `tier`
 */
export function TierSquares({ show, tier }: TierSquaresProps) {
	// Lazy useState — buildSquares calls Math.random(), which would
	// violate useMemo's purity contract (strict-mode double-render
	// would reshuffle the cluster). useState's initializer is invoked
	// exactly once per mount, so the randomized trajectories are
	// captured on first render and survive re-renders.
	const [squares] = useState(function init() {
		return buildSquares(TIER_BLUEPRINTS[tier]);
	});

	if (!show) return null;

	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
		>
			{squares.map(function renderSquare(square) {
				const style = {
					left: `${square.leftPercent}%`,
					top: `${square.topPercent}%`,
					width: `${square.sizePx}px`,
					height: `${square.sizePx}px`,
					borderRadius: `${square.radiusPx}px`,
					animationDelay: `${square.delayMs}ms`,
					animationDuration: `${square.durationMs}ms`,
					'--ts-x': `${square.xDriftPx}px`,
					'--ts-y': `${square.yDriftPx}px`,
					'--ts-r': `${square.rotateDeg}deg`,
				} as CSSProperties;
				return (
					<span
						key={square.id}
						style={style}
						className={cn(
							'motion-safe:animate-tier-square absolute opacity-0',
							square.colorClass,
						)}
					/>
				);
			})}
		</div>
	);
}
