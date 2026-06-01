import type { CSSProperties } from 'react';

import { type GameKind, PALETTE } from './games-content';

/**
 * Animated card-art previews for the hub game cards — the looping motifs from
 * the games selection screen (drifting sparks plus a per-game centrepiece:
 * a scratch stub, a flipping coin, shuffling cards). Pure SVG + CSS, no hooks,
 * so the cards stay server-rendered. Sparks ride the `hg-art-rise` keyframe;
 * the coin/card motions use the `hg-art-*` classes in `globals.css`.
 */

type SparkShape = 'star' | 'diamond';

interface Spark {
	readonly x: number;
	readonly y: number;
	readonly size: number;
	readonly color: string;
	readonly delay: number;
	readonly dur: number;
	readonly shape: SparkShape;
}

const SCRATCH_SPARKS: readonly Spark[] = [
	{
		x: 7,
		y: 68,
		size: 13,
		color: PALETTE.ink,
		delay: 0,
		dur: 2.4,
		shape: 'star',
	},
	{
		x: 84,
		y: 62,
		size: 11,
		color: PALETTE.sky,
		delay: 0.5,
		dur: 2.7,
		shape: 'star',
	},
	{
		x: 16,
		y: 79,
		size: 9,
		color: PALETTE.ink,
		delay: 1,
		dur: 2.2,
		shape: 'diamond',
	},
	{
		x: 73,
		y: 72,
		size: 14,
		color: PALETTE.ink,
		delay: 0.3,
		dur: 2.6,
		shape: 'star',
	},
	{
		x: 44,
		y: 83,
		size: 10,
		color: PALETTE.mint,
		delay: 1.3,
		dur: 2.9,
		shape: 'diamond',
	},
	{
		x: 91,
		y: 48,
		size: 9,
		color: PALETTE.ink,
		delay: 0.8,
		dur: 2.1,
		shape: 'star',
	},
	{
		x: 3,
		y: 57,
		size: 8,
		color: PALETTE.sky,
		delay: 1.6,
		dur: 2.5,
		shape: 'diamond',
	},
	{
		x: 57,
		y: 75,
		size: 11,
		color: PALETTE.ink,
		delay: 0.6,
		dur: 2.3,
		shape: 'star',
	},
	{
		x: 30,
		y: 88,
		size: 8,
		color: PALETTE.ink,
		delay: 1.9,
		dur: 2,
		shape: 'diamond',
	},
];

const COIN_SPARKS: readonly Spark[] = [
	{
		x: 6,
		y: 64,
		size: 12,
		color: PALETTE.ink,
		delay: 0,
		dur: 2.3,
		shape: 'star',
	},
	{
		x: 86,
		y: 69,
		size: 14,
		color: PALETTE.yellow,
		delay: 0.4,
		dur: 2.6,
		shape: 'star',
	},
	{
		x: 20,
		y: 81,
		size: 9,
		color: PALETTE.ink,
		delay: 0.9,
		dur: 2.1,
		shape: 'diamond',
	},
	{
		x: 75,
		y: 60,
		size: 11,
		color: PALETTE.mint,
		delay: 0.2,
		dur: 2.8,
		shape: 'star',
	},
	{
		x: 40,
		y: 86,
		size: 10,
		color: PALETTE.ink,
		delay: 1.2,
		dur: 2.4,
		shape: 'diamond',
	},
	{
		x: 92,
		y: 43,
		size: 8,
		color: PALETTE.yellow,
		delay: 0.7,
		dur: 2.7,
		shape: 'star',
	},
	{
		x: 5,
		y: 50,
		size: 9,
		color: PALETTE.ink,
		delay: 1.5,
		dur: 2.2,
		shape: 'star',
	},
	{
		x: 62,
		y: 76,
		size: 12,
		color: PALETTE.yellow,
		delay: 0.5,
		dur: 2.5,
		shape: 'diamond',
	},
	{
		x: 50,
		y: 90,
		size: 8,
		color: PALETTE.ink,
		delay: 1.8,
		dur: 2,
		shape: 'star',
	},
];

const MYSTERY_SPARKS: readonly Spark[] = [
	{
		x: 5,
		y: 63,
		size: 11,
		color: PALETTE.ink,
		delay: 0,
		dur: 2.5,
		shape: 'star',
	},
	{
		x: 87,
		y: 57,
		size: 13,
		color: PALETTE.yellow,
		delay: 0.6,
		dur: 2.2,
		shape: 'star',
	},
	{
		x: 14,
		y: 79,
		size: 8,
		color: PALETTE.ink,
		delay: 1.1,
		dur: 2.7,
		shape: 'diamond',
	},
	{
		x: 78,
		y: 68,
		size: 10,
		color: PALETTE.sky,
		delay: 0.3,
		dur: 2.4,
		shape: 'star',
	},
	{
		x: 48,
		y: 85,
		size: 12,
		color: PALETTE.ink,
		delay: 1.4,
		dur: 2.1,
		shape: 'diamond',
	},
	{
		x: 93,
		y: 44,
		size: 9,
		color: PALETTE.yellow,
		delay: 0.8,
		dur: 2.8,
		shape: 'star',
	},
	{
		x: 2,
		y: 52,
		size: 8,
		color: PALETTE.ink,
		delay: 1.7,
		dur: 2.3,
		shape: 'star',
	},
	{
		x: 65,
		y: 73,
		size: 11,
		color: PALETTE.sky,
		delay: 0.4,
		dur: 2.6,
		shape: 'diamond',
	},
	{
		x: 35,
		y: 89,
		size: 9,
		color: PALETTE.ink,
		delay: 2,
		dur: 2.2,
		shape: 'star',
	},
];

/** A single drifting spark (4-point star or diamond), rising + fading. */
function PreviewSpark({ spark }: { readonly spark: Spark }) {
	const style: CSSProperties = {
		left: `${spark.x}%`,
		top: `${spark.y}%`,
		width: spark.size,
		height: spark.size,
		animationDelay: `${spark.delay}s`,
		animationDuration: `${spark.dur}s`,
	};
	return (
		<div className="hg-art-rise pointer-events-none absolute" style={style}>
			{spark.shape === 'diamond' ? (
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
			) : (
				<svg
					width={spark.size}
					height={spark.size}
					viewBox="0 0 20 20"
					fill={spark.color}
				>
					<path d="M10 1L12.6 7.4L19 10L12.6 12.6L10 19L7.4 12.6L1 10L7.4 7.4Z" />
				</svg>
			)}
		</div>
	);
}

/** The drifting spark layer shared by every preview. */
function SparkField({ sparks }: { readonly sparks: readonly Spark[] }) {
	return (
		<>
			{sparks.map((spark, i) => (
				<PreviewSpark key={i} spark={spark} />
			))}
		</>
	);
}

/** Scratch stub with animated reveal lines + a sweeping coin. */
function ScratchPreview() {
	return (
		<svg width="140" height="96" viewBox="0 0 140 96" fill="none">
			<rect
				width="140"
				height="96"
				rx="10"
				fill={PALETTE.mint}
				stroke={PALETTE.ink}
				strokeWidth="2.5"
			/>
			<text
				x="70"
				y="58"
				textAnchor="middle"
				fontFamily="'Clash Display',system-ui"
				fontSize="30"
				fontWeight="600"
				fill="rgba(20,20,22,.12)"
				letterSpacing="-1"
			>
				+5
			</text>
			<path
				d="M 18 40 Q 70 35 122 42"
				stroke="rgba(20,20,22,.28)"
				strokeWidth="2.5"
				strokeLinecap="round"
				fill="none"
				strokeDasharray="120"
				strokeDashoffset="120"
			>
				<animate
					attributeName="stroke-dashoffset"
					values="120;0;0;120"
					keyTimes="0;0.28;0.68;1"
					dur="3.2s"
					repeatCount="indefinite"
				/>
			</path>
			<path
				d="M 16 52 Q 65 47 118 54"
				stroke="rgba(20,20,22,.2)"
				strokeWidth="2"
				strokeLinecap="round"
				fill="none"
				strokeDasharray="108"
				strokeDashoffset="108"
			>
				<animate
					attributeName="stroke-dashoffset"
					values="108;0;0;108"
					keyTimes="0;0.30;0.70;1"
					dur="3.2s"
					begin="0.45s"
					repeatCount="indefinite"
				/>
			</path>
			<path
				d="M 20 63 Q 72 59 120 65"
				stroke="rgba(20,20,22,.15)"
				strokeWidth="1.5"
				strokeLinecap="round"
				fill="none"
				strokeDasharray="104"
				strokeDashoffset="104"
			>
				<animate
					attributeName="stroke-dashoffset"
					values="104;0;0;104"
					keyTimes="0;0.32;0.72;1"
					dur="3.2s"
					begin="0.75s"
					repeatCount="indefinite"
				/>
			</path>
			<g>
				<animateTransform
					attributeName="transform"
					type="translate"
					values="-32,0;100,0;100,0;-32,0"
					keyTimes="0;0.30;0.68;1"
					dur="3.2s"
					repeatCount="indefinite"
				/>
				<circle cx="16" cy="48" r="12" fill={PALETTE.ink} opacity="0.55" />
				<circle cx="16" cy="48" r="6" fill={PALETTE.yellow} opacity="0.9" />
			</g>
			<rect
				x="8"
				y="8"
				width="124"
				height="80"
				rx="6"
				fill="none"
				stroke={PALETTE.ink}
				strokeWidth="1"
				strokeDasharray="5 4"
				opacity="0.25"
			/>
		</svg>
	);
}

interface CoinPreviewFaceProps {
	readonly label: string;
	readonly fill: string;
	readonly labelFill: string;
	readonly subFill: string;
}

/** One face of the spinning preview coin. */
function CoinPreviewFace({
	label,
	fill,
	labelFill,
	subFill,
}: CoinPreviewFaceProps) {
	return (
		<svg width="96" height="96" viewBox="0 0 96 96" fill="none">
			<circle
				cx="48"
				cy="48"
				r="42"
				fill={fill}
				stroke={PALETTE.ink}
				strokeWidth="2.5"
			/>
			<circle
				cx="48"
				cy="48"
				r="32"
				fill="none"
				stroke={PALETTE.ink}
				strokeWidth="1.5"
				strokeDasharray="4 3"
			/>
			<text
				x="48"
				y="43"
				textAnchor="middle"
				fontFamily="'Clash Display',system-ui"
				fontSize="15"
				fontWeight="600"
				fill={labelFill}
			>
				{label}
			</text>
			<text
				x="48"
				y="60"
				textAnchor="middle"
				fontFamily="'Geist',system-ui"
				fontSize="7"
				fontWeight="600"
				fill={subFill}
				letterSpacing="2.5"
			>
				RAFLI
			</text>
		</svg>
	);
}

/** A 3D coin flipping heads ↔ tails on a loop. */
function CoinPreview() {
	return (
		<div className="hg-art-coin-stage relative">
			<div className="hg-art-coin size-24">
				<div className="hg-art-coin-face">
					<CoinPreviewFace
						label="HEADS"
						fill={PALETTE.yellow}
						labelFill={PALETTE.ink}
						subFill={PALETTE.ink}
					/>
				</div>
				<div className="hg-art-coin-face hg-art-coin-back">
					<CoinPreviewFace
						label="TAILS"
						fill={PALETTE.sky}
						labelFill="rgba(20,20,22,.7)"
						subFill="rgba(20,20,22,.45)"
					/>
				</div>
			</div>
		</div>
	);
}

interface MiniCardProps {
	readonly label: string;
	readonly fill: string;
	readonly width: number;
	readonly height: number;
	readonly labelFill: string;
	readonly stroke: number;
}

/** A single face-down mystery card used in the shuffle preview. */
function MiniCard({
	label,
	fill,
	width,
	height,
	labelFill,
	stroke,
}: MiniCardProps) {
	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			fill="none"
		>
			<rect
				width={width}
				height={height}
				rx="6"
				fill={fill}
				stroke={PALETTE.ink}
				strokeWidth={stroke}
			/>
			<text
				x={width / 2}
				y={height / 2 + 8}
				textAnchor="middle"
				fontFamily="'Clash Display',system-ui"
				fontSize="24"
				fontWeight="600"
				fill={labelFill}
			>
				{label}
			</text>
		</svg>
	);
}

/** Three cards fanning out and shuffling back on a loop. */
function MysteryPreview() {
	return (
		<div className="relative h-32 w-44">
			<div className="hg-art-card-1 absolute top-2.5 left-0">
				<MiniCard
					label="1"
					fill={PALETTE.sky}
					width={68}
					height={104}
					labelFill="rgba(20,20,22,.4)"
					stroke={2}
				/>
			</div>
			<div className="hg-art-card-3 absolute top-2.5 right-0">
				<MiniCard
					label="3"
					fill={PALETTE.mint}
					width={68}
					height={104}
					labelFill="rgba(20,20,22,.4)"
					stroke={2}
				/>
			</div>
			<div className="hg-art-card-2 absolute top-0 left-13 z-10">
				<MiniCard
					label="2"
					fill={PALETTE.yellow}
					width={68}
					height={108}
					labelFill={PALETTE.ink}
					stroke={2.5}
				/>
			</div>
		</div>
	);
}

/** Spark layout keyed by game motif. */
const SPARKS_BY_KIND: Record<GameKind, readonly Spark[]> = {
	scratch: SCRATCH_SPARKS,
	coinflip: COIN_SPARKS,
	mystery: MYSTERY_SPARKS,
};

interface GamePreviewProps {
	readonly kind: GameKind;
}

/**
 * The animated art preview for a hub game card, matching the games
 * selection-screen motif for that game.
 *
 * @param kind - Which game motif to render
 * @returns The full-bleed preview layer
 */
export function GamePreview({ kind }: GamePreviewProps) {
	const sparks = SPARKS_BY_KIND[kind];
	return (
		<div className="relative size-full overflow-hidden">
			<SparkField sparks={sparks} />
			<div className="absolute inset-0 flex items-center justify-center">
				{kind === 'scratch' ? <ScratchPreview /> : null}
				{kind === 'coinflip' ? <CoinPreview /> : null}
				{kind === 'mystery' ? <MysteryPreview /> : null}
			</div>
		</div>
	);
}
