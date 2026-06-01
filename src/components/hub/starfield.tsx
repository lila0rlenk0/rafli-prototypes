import type { CSSProperties } from 'react';

/**
 * Animated page background — the same drifting-spark motif as the game-card
 * previews, scaled up to a full-bleed underlay. Four-point stars and diamonds
 * in the brand trio (blue / green / yellow) pop up from the back, rise, and
 * fade, on staggered loops.
 *
 * Purely decorative: `aria-hidden`, `-z-10` underlay, `pointer-events-none`.
 * Placement/timing is derived deterministically from the index (no
 * `Math.random`) so the server and client render identical markup — random
 * values would desync on hydration. The rise/fade loop lives in the `hg-star`
 * keyframe (`globals.css`), which honours `prefers-reduced-motion`.
 *
 * @returns The full-bleed animated spark layer
 */
const STAR_COLORS = ['#c4edff', '#beffdb', '#f6ff8b'] as const;
const STAR_COUNT = 56;

type SparkShape = 'star' | 'diamond';

interface Spark {
	readonly left: number;
	readonly bottom: number;
	readonly size: number;
	readonly color: string;
	readonly delay: number;
	readonly dur: number;
	readonly shape: SparkShape;
}

/** Deterministic pseudo-scatter from the index — stable across SSR/hydration. */
const SPARKS: readonly Spark[] = Array.from({ length: STAR_COUNT }, (_, i) => ({
	left: (i * 97) % 100,
	bottom: (i * 53) % 100,
	size: 8 + (i % 5) * 3,
	color: STAR_COLORS[i % STAR_COLORS.length],
	delay: (i % 12) * 0.55,
	dur: 5 + (i % 6),
	// Alternate the two motifs the same way the card previews do.
	shape: i % 2 === 0 ? 'star' : 'diamond',
}));

/** One drifting spark — a four-point star or a diamond. */
function SparkGlyph({ spark }: { readonly spark: Spark }) {
	if (spark.shape === 'diamond') {
		return (
			<svg
				width={spark.size}
				height={spark.size}
				viewBox="0 0 16 16"
				fill={spark.color}
			>
				<rect
					x="3"
					y="3"
					width="10"
					height="10"
					rx="1"
					transform="rotate(45 8 8)"
				/>
			</svg>
		);
	}
	return (
		<svg
			width={spark.size}
			height={spark.size}
			viewBox="0 0 20 20"
			fill={spark.color}
		>
			<path d="M10 1L12.6 7.4L19 10L12.6 12.6L10 19L7.4 12.6L1 10L7.4 7.4Z" />
		</svg>
	);
}

export function Starfield() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
		>
			{SPARKS.map((spark, i) => {
				const style: CSSProperties = {
					left: `${spark.left}%`,
					bottom: `${spark.bottom}%`,
					width: spark.size,
					height: spark.size,
					animationDelay: `${spark.delay}s`,
					animationDuration: `${spark.dur}s`,
				};
				return (
					<div key={i} className="hg-star absolute" style={style}>
						<SparkGlyph spark={spark} />
					</div>
				);
			})}
		</div>
	);
}
