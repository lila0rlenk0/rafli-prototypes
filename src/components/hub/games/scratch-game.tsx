'use client';

import type { CSSProperties, Dispatch, RefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

import { Confetti } from './confetti';
import {
	AddedToBalance,
	Balance,
	GameCta,
	GameDivider,
	GameHeader,
	type GameHeaderSpec,
	GameHero,
	GameMetaBar,
	GameScreen,
	ResetBlock,
} from './game-frame';
import { LOSS_TITLE, PALETTE } from './games-content';
import { sfx } from './sfx';
import { type FlashType, useFlashShake } from './use-flash-shake';

type ScratchPhase = 'playing' | 'win' | 'loss';
type ScratchOutcome = 'win' | 'loss';

/** Foil-card pixel dimensions (w-80 × h-56 in the Tailwind scale). */
const CARD_W = 320;
const CARD_H = 224;
/** Credits a winning scratch pays. */
const WIN_AWARD = 5;
/** Brush radius in canvas px. */
const BRUSH = 21;
/** Coverage past which the prize blurs in / resolves. */
const REVEAL_AT = 0.58;
const RESOLVE_AT = 0.68;

/** Escalating float-message copy, staged by scratch progress. */
const STAGE_MESSAGES: readonly (readonly string[])[] = [
	[
		"Psst… something's under there 👀",
		"The foil won't scratch itself!",
		"Don't be shy, give it a go!",
	],
	[
		"You're doing great, keep going!",
		"That's it! More, more!",
		'Ooh, interesting start…',
	],
	[
		"We're watching 👀 Don't stop!",
		'The suspense is REAL',
		'Give it more — we believe in you!',
	],
	['Almost… almost!', "Don't. Stop. Now.", "Ooh it's getting good…"],
	['ONE MORE SWIPE!!', 'HERE IT COMES…', '⚡ FINAL REVEAL ⚡'],
];

interface FloatMsg {
	readonly id: number;
	readonly text: string;
	readonly x: number;
	readonly y: number;
	readonly rotate: number;
}

/** Float-message style carries its rotation into the keyframe. */
type FloatStyle = CSSProperties & { readonly '--hg-r': string };

interface PrizeArtProps {
	readonly outcome: ScratchOutcome;
}

/** The art hiding under the foil — a +5 win panel or a "no match" panel. */
function PrizeArt({ outcome }: PrizeArtProps) {
	if (outcome === 'win') {
		return (
			<svg
				width={CARD_W}
				height={CARD_H}
				viewBox={`0 0 ${CARD_W} ${CARD_H}`}
				fill="none"
				className="block"
			>
				<rect
					width={CARD_W}
					height={CARD_H}
					rx="10"
					fill={PALETTE.yellow}
					stroke={PALETTE.ink}
					strokeWidth="2"
				/>
				<text
					x={CARD_W / 2}
					y={CARD_H / 2 + 12}
					textAnchor="middle"
					fontFamily="'Clash Display',system-ui"
					fontSize="64"
					fontWeight="600"
					fill={PALETTE.ink}
					letterSpacing="-3"
				>
					+{WIN_AWARD}
				</text>
				<text
					x={CARD_W / 2}
					y={CARD_H / 2 + 38}
					textAnchor="middle"
					fontFamily="'Geist',system-ui"
					fontSize="13"
					fontWeight="600"
					fill={PALETTE.muted}
					letterSpacing="2.5"
				>
					CREDITS
				</text>
			</svg>
		);
	}
	return (
		<svg
			width={CARD_W}
			height={CARD_H}
			viewBox={`0 0 ${CARD_W} ${CARD_H}`}
			fill="none"
			className="block"
		>
			<rect
				width={CARD_W}
				height={CARD_H}
				rx="10"
				fill={PALETTE.surfaceMuted}
			/>
			<rect
				x="1"
				y="1"
				width={CARD_W - 2}
				height={CARD_H - 2}
				rx="9.5"
				fill="none"
				stroke="#e5e5e5"
				strokeWidth="1.5"
			/>
			<text
				x={CARD_W / 2}
				y={CARD_H / 2 + 12}
				textAnchor="middle"
				fontFamily="'Clash Display',system-ui"
				fontSize="60"
				fontWeight="600"
				fill="#c4c4c4"
			>
				—
			</text>
			<text
				x={CARD_W / 2}
				y={CARD_H / 2 + 38}
				textAnchor="middle"
				fontFamily="'Geist',system-ui"
				fontSize="12"
				fontWeight="600"
				fill={PALETTE.faint}
				letterSpacing="2.5"
			>
				NO MATCH
			</text>
		</svg>
	);
}

/** A bouncing finger hint nudging the first scratch. */
function FingerHint() {
	return (
		<div className="hg-finger pointer-events-none absolute right-4 bottom-3.5 z-10">
			<svg width="34" height="44" viewBox="0 0 34 44" fill="none">
				<rect
					x="11"
					y="1"
					width="12"
					height="26"
					rx="6"
					fill={PALETTE.ink}
					opacity=".7"
				/>
				<path
					d="M6 20 C4 20 4 24 4 28 C4 36 9.5 43 17 43 C24.5 43 30 36 30 28 C30 24 30 20 28 20 L23 20 L23 26 C23 28 20 29 17 29 C14 29 11 28 11 26 L11 20 Z"
					fill={PALETTE.ink}
					opacity=".7"
				/>
				<ellipse
					cx="17"
					cy="6"
					rx="3.5"
					ry="2.5"
					fill="rgba(255,255,255,.28)"
				/>
			</svg>
		</div>
	);
}

interface PointerLike {
	readonly clientX: number;
	readonly clientY: number;
}

/** Reads a mouse/touch position in canvas pixel space. */
function pointerPos(
	event: React.MouseEvent | React.TouchEvent,
	canvas: HTMLCanvasElement,
): { x: number; y: number } {
	const rect = canvas.getBoundingClientRect();
	const source: PointerLike = 'touches' in event ? event.touches[0] : event;
	return {
		x: (source.clientX - rect.left) * (canvas.width / rect.width),
		y: (source.clientY - rect.top) * (canvas.height / rect.height),
	};
}

/** Paints the mint foil + dotted texture + prompt onto the canvas. */
function paintFoil(canvas: HTMLCanvasElement): void {
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return;
	}
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = PALETTE.mint;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'rgba(255,255,255,.25)';
	for (let x = 3; x < canvas.width; x += 12) {
		for (let y = 3; y < canvas.height; y += 12) {
			ctx.beginPath();
			ctx.arc(x, y, 1.1, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	ctx.strokeStyle = 'rgba(20,20,22,.2)';
	ctx.lineWidth = 1.5;
	ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
	ctx.fillStyle = 'rgba(20,20,22,.42)';
	ctx.textAlign = 'center';
	ctx.font = "600 13px 'Clash Display',system-ui";
	ctx.fillText('SCRATCH TO REVEAL', canvas.width / 2, canvas.height / 2 + 4);
}

/** Coverage % → message stage index. */
function coverageStage(pct: number): number {
	if (pct < 0.12) {
		return 0;
	}
	if (pct < 0.28) {
		return 1;
	}
	if (pct < 0.45) {
		return 2;
	}
	if (pct < 0.6) {
		return 3;
	}
	return 4;
}

/** Progress-bar fill colour ramping blue → green → gold. */
function barColorFor(coverage: number): string {
	if (coverage < 0.15) {
		return PALETTE.sky;
	}
	if (coverage < REVEAL_AT) {
		return PALETTE.mint;
	}
	return PALETTE.yellow;
}

/** Header copy per scratch phase (guard clauses keep JSX ternary-free). */
function scratchHeader(phase: ScratchPhase): GameHeaderSpec {
	if (phase === 'playing') {
		return {
			eyebrow: 'Scratching…',
			tone: 'active',
			title: "Today's lucky stub",
			titleSize: 'md',
		};
	}
	if (phase === 'win') {
		return {
			eyebrow: 'You won',
			tone: 'win',
			title: `+${WIN_AWARD} credits`,
			titleSize: 'lg',
		};
	}
	return {
		eyebrow: 'Scratch card',
		tone: 'muted',
		title: LOSS_TITLE,
		titleSize: 'lg',
	};
}

interface ScratchCanvas {
	readonly outcome: ScratchOutcome;
	readonly phase: ScratchPhase;
	readonly coverage: number;
	readonly floatMsgs: readonly FloatMsg[];
	readonly canvasRef: RefObject<HTMLCanvasElement | null>;
	readonly onStart: (e: React.MouseEvent | React.TouchEvent) => void;
	readonly onMove: (e: React.MouseEvent | React.TouchEvent) => void;
	readonly onStop: () => void;
}

interface UseScratchArgs {
	readonly setCredits: Dispatch<SetStateAction<number>>;
	readonly trigger: (type: FlashType) => void;
}

/**
 * Owns the scratch canvas: foil painting, drag-erase, coverage measurement,
 * staged float messages, and the pre-rolled win/loss resolution. Lifting this
 * out of the component keeps both functions within the size/complexity caps.
 *
 * @returns The canvas ref, live state, and pointer handlers
 */
function useScratchCanvas({
	setCredits,
	trigger,
}: UseScratchArgs): ScratchCanvas {
	const [outcome] = useState<ScratchOutcome>(() =>
		Math.random() > 0.45 ? 'win' : 'loss',
	);
	const [phase, setPhase] = useState<ScratchPhase>('playing');
	const [coverage, setCoverage] = useState(0);
	const [floatMsgs, setFloatMsgs] = useState<FloatMsg[]>([]);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isDrawing = useRef(false);
	const isResolved = useRef(false);
	const lastStage = useRef(-1);
	const playedReveal = useRef(false);
	const msgId = useRef(0);

	// mount: paint the foil once the canvas is in the DOM.
	useEffect(() => {
		const id = setTimeout(() => {
			if (canvasRef.current) {
				paintFoil(canvasRef.current);
			}
		}, 40);
		return () => clearTimeout(id);
	}, []);

	const spawnMsg = useCallback((text: string) => {
		const id = (msgId.current += 1);
		setFloatMsgs(prev => [
			...prev,
			{
				id,
				text,
				x: 8 + Math.random() * 62,
				y: 8 + Math.random() * 72,
				rotate: -10 + Math.random() * 20,
			},
		]);
		setTimeout(() => setFloatMsgs(prev => prev.filter(m => m.id !== id)), 1600);
	}, []);

	const resolveCoverage = useCallback(
		(pct: number) => {
			const stage = coverageStage(pct);
			if (stage !== lastStage.current) {
				lastStage.current = stage;
				const options = STAGE_MESSAGES[stage];
				spawnMsg(options[Math.floor(Math.random() * options.length)]);
			}
			if (pct > REVEAL_AT && !playedReveal.current) {
				playedReveal.current = true;
				sfx.reveal();
			}
			if (pct > RESOLVE_AT && !isResolved.current) {
				isResolved.current = true;
				setTimeout(() => {
					if (outcome === 'win') {
						setCredits(c => c + WIN_AWARD);
						sfx.win();
					} else {
						sfx.loss();
					}
					trigger(outcome);
					setPhase(outcome);
				}, 600);
			}
		},
		[outcome, setCredits, spawnMsg, trigger],
	);

	const handleMove = useCallback(
		(event: React.MouseEvent | React.TouchEvent) => {
			const canvas = canvasRef.current;
			if (!isDrawing.current || isResolved.current || !canvas) {
				return;
			}
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				return;
			}
			event.preventDefault();
			sfx.scratch();
			const pos = pointerPos(event, canvas);
			ctx.globalCompositeOperation = 'destination-out';
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, BRUSH, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalCompositeOperation = 'source-over';
			const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
			let cleared = 0;
			for (let i = 3; i < data.length; i += 4) {
				if (data[i] < 64) {
					cleared += 1;
				}
			}
			const pct = cleared / (data.length / 4);
			setCoverage(pct);
			resolveCoverage(pct);
		},
		[resolveCoverage],
	);

	const handleStart = useCallback(
		(event: React.MouseEvent | React.TouchEvent) => {
			isDrawing.current = true;
			handleMove(event);
		},
		[handleMove],
	);

	const handleStop = useCallback(() => {
		isDrawing.current = false;
	}, []);

	return {
		outcome,
		phase,
		coverage,
		floatMsgs,
		canvasRef,
		onStart: handleStart,
		onMove: handleMove,
		onStop: handleStop,
	};
}

interface FloatMessagesProps {
	readonly messages: readonly FloatMsg[];
}

/** The playful speech bubbles that pop across the card mid-scratch. */
function FloatMessages({ messages }: FloatMessagesProps) {
	return (
		<>
			{messages.map(m => {
				const style: FloatStyle = {
					left: `${m.x}%`,
					top: `${m.y}%`,
					'--hg-r': `${m.rotate}deg`,
				};
				return (
					<div
						key={m.id}
						className="hg-float-msg border-brand-dark font-clash-display text-ink-900 pointer-events-none absolute z-10 rounded-full border-2 bg-white px-3.5 py-1.5 text-base font-bold whitespace-nowrap"
						style={style}
					>
						{m.text}
					</div>
				);
			})}
		</>
	);
}

interface LeaveConfirmProps {
	readonly onLeave: () => void;
	readonly onStay: () => void;
}

/** The "you'll lose the credit" guard shown when leaving mid-scratch. */
function LeaveConfirm({ onLeave, onStay }: LeaveConfirmProps) {
	return (
		<div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 p-6">
			<div className="bg-background flex w-full flex-col gap-4 rounded-2xl p-7">
				<div className="flex flex-col gap-2">
					<p className="font-clash-display text-ink-900 text-xl font-semibold">
						Leave the game?
					</p>
					<p className="text-ink-500 text-body-sm">
						If you leave now, you will lose the credit.
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Button type="button" size="lg" className="w-full" onClick={onLeave}>
						Leave game
					</Button>
					<Button
						type="button"
						size="lg"
						variant="outline"
						className="w-full"
						onClick={onStay}
					>
						Keep scratching
					</Button>
				</div>
			</div>
		</div>
	);
}

interface PlayingHeroProps {
	readonly scratch: ScratchCanvas;
}

/** The live scratch surface + progress bar. */
function PlayingHero({ scratch }: PlayingHeroProps) {
	const { coverage, outcome, canvasRef, onStart, onMove, onStop } = scratch;
	const prizeVisible =
		coverage < REVEAL_AT ? 0 : Math.min(1, (coverage - REVEAL_AT) / 0.16);
	const prizeBlur = Math.max(
		0,
		22 * (1 - Math.max(0, (coverage - REVEAL_AT) / 0.12)),
	);
	const prizeStyle: CSSProperties = {
		opacity: prizeVisible,
		filter: `blur(${prizeBlur}px)`,
	};
	const fillStyle: CSSProperties = {
		width: `${Math.round(coverage * 100)}%`,
		background: barColorFor(coverage),
	};
	return (
		<>
			<div className="border-brand-dark relative h-56 w-80 shrink-0 overflow-hidden rounded-xl border-2 select-none">
				<div
					className="pointer-events-none absolute inset-0 transition-[opacity,filter] duration-200"
					style={prizeStyle}
				>
					<PrizeArt outcome={outcome} />
				</div>
				<canvas
					ref={canvasRef}
					width={CARD_W}
					height={CARD_H}
					className="hg-scratch-canvas absolute inset-0 block rounded-xl"
					onMouseDown={onStart}
					onMouseMove={onMove}
					onMouseUp={onStop}
					onMouseLeave={onStop}
					onTouchStart={onStart}
					onTouchMove={onMove}
					onTouchEnd={onStop}
				/>
				{coverage < 0.02 ? <FingerHint /> : null}
			</div>
			<div className="border-brand-dark bg-ink-150 h-2 w-80 overflow-hidden rounded-full border">
				<div
					className="h-full rounded-full transition-[width] duration-100"
					style={fillStyle}
				/>
			</div>
		</>
	);
}

interface ScratchHeroProps {
	readonly scratch: ScratchCanvas;
}

/** The hero region, switched by phase. */
function ScratchHero({ scratch }: ScratchHeroProps) {
	return (
		<GameHero>
			{scratch.phase === 'playing' ? <PlayingHero scratch={scratch} /> : null}
			{scratch.phase === 'win' ? (
				<>
					<div className="hg-p0 hg-glow-rect">
						<PrizeArt outcome="win" />
					</div>
					<p className="hg-p2 font-clash-display text-ink-900 text-3xl font-semibold">
						Scratch card revealed!
					</p>
					<div className="hg-p3">
						<ResetBlock message="Your daily scratch is done — tomorrow's foil is already waiting ✨" />
					</div>
				</>
			) : null}
			{scratch.phase === 'loss' ? (
				<>
					<div className="hg-p0">
						<PrizeArt outcome="loss" />
					</div>
					<div className="hg-p2">
						<ResetBlock message={LOSS_TITLE} large />
					</div>
				</>
			) : null}
		</GameHero>
	);
}

interface ScratchMetaProps {
	readonly phase: ScratchPhase;
	readonly credits: number;
}

/** The status row above the CTA. */
function ScratchMeta({ phase, credits }: ScratchMetaProps) {
	return (
		<GameMetaBar>
			{phase === 'playing' ? (
				<>
					<span className="bg-brand-mint border-brand-dark inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold">
						Free today
					</span>
					<Balance credits={credits} />
				</>
			) : null}
			{phase === 'win' ? (
				<>
					<Balance credits={credits} delta={WIN_AWARD} />
					<AddedToBalance />
				</>
			) : null}
			{phase === 'loss' ? (
				<>
					<Balance credits={credits} />
					<span className="text-ink-500 text-xs">No match today</span>
				</>
			) : null}
		</GameMetaBar>
	);
}

interface ScratchGameProps {
	readonly credits: number;
	readonly setCredits: Dispatch<SetStateAction<number>>;
	readonly onClose: () => void;
}

/**
 * The free daily scratch card. Opens straight into scratching — drag across
 * the canvas to erase foil. The prize stays blurred until ~58% is cleared,
 * then resolves to a pre-rolled win (+5) or loss at ~68%. Leaving mid-scratch
 * prompts a confirmation since the (free) play would be forfeited.
 *
 * @param credits - Current shared balance
 * @param setCredits - Balance setter (lifted to the deck)
 * @param onClose - Return to the game selection
 * @returns The scratch-card screen
 */
export function ScratchGame({
	credits,
	setCredits,
	onClose,
}: ScratchGameProps) {
	const { flash, isShaking, trigger } = useFlashShake();
	const scratch = useScratchCanvas({ setCredits, trigger });
	const [showConfirm, setShowConfirm] = useState(false);
	const { phase, coverage } = scratch;

	function handleClose() {
		if (phase !== 'playing' || coverage === 0) {
			onClose();
			return;
		}
		setShowConfirm(true);
	}

	const header = scratchHeader(phase);

	return (
		<GameScreen isShaking={isShaking} flash={flash}>
			{phase === 'win' ? <Confetti /> : null}
			{showConfirm ? (
				<LeaveConfirm onLeave={onClose} onStay={() => setShowConfirm(false)} />
			) : null}
			{phase === 'playing' ? (
				<FloatMessages messages={scratch.floatMsgs} />
			) : null}

			<GameHeader {...header} onClose={handleClose} />
			<GameDivider />
			<ScratchHero scratch={scratch} />
			<ScratchMeta phase={phase} credits={credits} />

			<GameCta>
				{phase === 'playing' ? (
					<Button
						type="button"
						size="lg"
						className="w-full"
						variant="outline"
						disabled
					>
						Keep scratching…
					</Button>
				) : (
					<Button
						type="button"
						size="lg"
						className="hg-p5 w-full"
						variant={phase === 'win' ? 'default' : 'outline'}
						onClick={onClose}
					>
						Back to games
					</Button>
				)}
			</GameCta>
		</GameScreen>
	);
}
