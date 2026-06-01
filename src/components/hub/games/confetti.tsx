'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';

/** Bright celebratory palette — mostly brand accents + a few festive pops. */
const BRIGHT = [
	'#c4edff',
	'#f6ff8b',
	'#beffdb',
	'#fef9c3',
	'#ffffff',
	'#f6e030',
	'#13e36f',
	'#00b8ff',
	'#ffb347',
	'#ff85a1',
] as const;

/** Occasional dark confetti for contrast against the light surface. */
const DARK = ['#141416', '#1c1c1e'] as const;

const PIECE_COUNT = 220;

interface ConfettiPiece {
	readonly left: number;
	readonly width: number;
	readonly height: number;
	readonly color: string;
	readonly driftX: string;
	readonly rotate: string;
	readonly delay: number;
	readonly duration: number;
	readonly round: boolean;
}

/** Per-piece CSS — the drift/rotation feed the keyframe via custom props. */
type PieceStyle = CSSProperties & {
	readonly '--hg-cx': string;
	readonly '--hg-cr': string;
};

/**
 * Builds one batch of randomised confetti. Generated once per win (in a
 * `useState` initialiser) so the burst is stable across re-renders.
 *
 * @returns The piece descriptors for a single celebration
 */
function buildPieces(): ConfettiPiece[] {
	return Array.from({ length: PIECE_COUNT }, (_, i) => {
		const isDark = i % 8 === 0;
		const palette = isDark ? DARK : BRIGHT;
		const big = Math.random() > 0.78;
		return {
			left: 1 + Math.random() * 98,
			width: (big ? 13 : 5) + Math.random() * (big ? 9 : 8),
			height: (big ? 11 : 4) + Math.random() * (big ? 7 : 8),
			color: palette[Math.floor(Math.random() * palette.length)],
			driftX: `${-120 + Math.random() * 240}px`,
			rotate: `${60 + Math.random() * 960}deg`,
			delay: Math.random() * 950,
			duration: 1100 + Math.random() * 1700,
			round: Math.random() > 0.45,
		};
	});
}

/**
 * Full-bleed confetti burst rendered over a winning result. Each of the 220
 * pieces is a transform-only animated span; positions, colours, and timing
 * are randomised data that Tailwind cannot express, so they ride on inline
 * styles + CSS custom properties consumed by the `hg-confetti` keyframe.
 *
 * @returns The confetti overlay layer
 */
export function Confetti() {
	const [pieces] = useState(buildPieces);
	return (
		<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
			{pieces.map((p, i) => {
				const style: PieceStyle = {
					left: `${p.left}%`,
					width: p.width,
					height: p.height,
					background: p.color,
					borderRadius: p.round ? '50%' : '2px',
					animationDelay: `${p.delay}ms`,
					animationDuration: `${p.duration}ms`,
					'--hg-cx': p.driftX,
					'--hg-cr': p.rotate,
				};
				return (
					<span
						key={i}
						aria-hidden
						className="hg-confetti-piece absolute top-0"
						style={style}
					/>
				);
			})}
		</div>
	);
}
