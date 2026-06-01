'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';

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
import { useFlashShake } from './use-flash-shake';

type CardPhase = 'idle' | 'flipping' | 'win' | 'loss';
type CardId = 1 | 2 | 3;

/** How long the cards orbit before resolving (ms). */
const ORBIT_MS = 4400;

/** Playful, never-revealing commentary keyed by which card was first picked. */
const FIRST_PICK: Record<CardId, readonly string[]> = {
	1: [
		'Bold — going straight to #1!',
		'First instinct rules. Respect.',
		'Card 1 energy. We see it.',
	],
	2: [
		'The classic middle pick…',
		'Something about card 2.',
		'Safe? Or secretly strategic?',
	],
	3: [
		'Third card! A classic choice.',
		'Lucky number three, right?',
		'Going for the last one!',
	],
};
const SWITCH_PICK = [
	'Changed your mind? The cards respect that.',
	'A switcher. Bold move.',
	'Trust the gut change!',
	'Ooh — last-minute swap…',
] as const;
const SAME_PICK: Record<CardId, string> = {
	1: 'Feeling confident about #1. We like it.',
	2: 'Card 2… something feels right.',
	3: 'Card 3 is calling your name. Go!',
};

interface CardsIdleProps {
	readonly selected: CardId | null;
	readonly onSelect: (id: CardId) => void;
}

/** The three face-down cards, fanned and tappable. */
function CardsIdle({ selected, onSelect }: CardsIdleProps) {
	const cards = [
		{
			id: 1 as CardId,
			cx: 75,
			rot: -12,
			color: PALETTE.sky,
			x: 30,
			y: 35,
			w: 90,
			h: 150,
		},
		{
			id: 3 as CardId,
			cx: 225,
			rot: 12,
			color: PALETTE.yellow,
			x: 180,
			y: 35,
			w: 90,
			h: 150,
		},
		{
			id: 2 as CardId,
			cx: 150,
			rot: 0,
			color: PALETTE.mint,
			x: 105,
			y: 23,
			w: 90,
			h: 156,
		},
	];
	return (
		<svg
			width="300"
			height="210"
			viewBox="0 0 300 210"
			fill="none"
			className="shrink-0"
		>
			{cards.map(card => {
				const isSel = selected === card.id;
				const yo = isSel ? -9 : 0;
				const rot = isSel ? 0 : card.rot;
				return (
					<g
						key={card.id}
						transform={`translate(${card.cx},${110 + yo}) rotate(${rot}) translate(-${card.cx},-${110 + yo})`}
						onClick={() => onSelect(card.id)}
						className="cursor-pointer"
						opacity={isSel ? 1 : 0.55}
					>
						{isSel ? (
							<rect
								x={card.x - 5}
								y={card.y - 5 + yo}
								width={card.w + 10}
								height={card.h + 10}
								rx="13"
								fill="none"
								stroke={PALETTE.ink}
								strokeWidth="2.5"
							/>
						) : null}
						<rect
							x={card.x}
							y={card.y + yo}
							width={card.w}
							height={card.h}
							rx="8"
							fill={card.color}
							stroke={PALETTE.ink}
							strokeWidth={isSel ? '2' : '1.5'}
						/>
						<text
							x={card.cx}
							y={card.y + card.h / 2 + 14 + yo}
							textAnchor="middle"
							fontFamily="'Clash Display',system-ui"
							fontSize="34"
							fontWeight="600"
							fill={isSel ? PALETTE.ink : PALETTE.inkSoft}
						>
							{card.id}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

interface CardOrbitProps {
	readonly selected: CardId | null;
	readonly onDone: () => void;
}

/**
 * The reveal animation — the three cards orbit a centre hub while the
 * selected one stays bright, then `onDone` fires once the orbit completes.
 *
 * @returns The orbiting cards
 */
function CardOrbit({ selected, onDone }: CardOrbitProps) {
	const [angle, setAngle] = useState(0);
	const onDoneRef = useRef(onDone);

	// keep the latest onDone without restarting the orbit effect.
	useEffect(() => {
		onDoneRef.current = onDone;
	}, [onDone]);

	// mount: drive the orbit with rAF; fire onDone once at the end.
	useEffect(() => {
		const start = performance.now();
		let raf = 0;
		let fired = false;
		function tick(now: number) {
			const elapsed = now - start;
			setAngle((elapsed * 0.18) % 360);
			if (elapsed < ORBIT_MS) {
				raf = requestAnimationFrame(tick);
			} else if (!fired) {
				fired = true;
				onDoneRef.current();
			}
		}
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, []);

	const radius = 68;
	const cw = 70;
	const ch = 100;
	const cards = [
		{ id: 1, base: 0, color: PALETTE.sky },
		{ id: 2, base: 120, color: PALETTE.mint },
		{ id: 3, base: 240, color: PALETTE.yellow },
	];
	return (
		<div className="relative size-56 shrink-0">
			{cards.map(card => {
				const a = ((card.base + angle - 90) * Math.PI) / 180;
				const isSel = card.id === selected;
				const cardStyle = {
					left: 110 + Math.cos(a) * radius - cw / 2,
					top: 110 + Math.sin(a) * radius - ch / 2,
					width: cw,
					height: ch,
					opacity: isSel ? 1 : 0.38,
				};
				return (
					<div key={card.id} className="absolute" style={cardStyle}>
						<svg width={cw} height={ch} viewBox={`0 0 ${cw} ${ch}`} fill="none">
							<rect
								width={cw}
								height={ch}
								rx="8"
								fill={card.color}
								stroke={PALETTE.ink}
								strokeWidth={isSel ? '2' : '1.5'}
							/>
							<text
								x={cw / 2}
								y={ch / 2 + 10}
								textAnchor="middle"
								fontFamily="'Clash Display',system-ui"
								fontSize="24"
								fontWeight="600"
								fill={isSel ? PALETTE.ink : PALETTE.inkSoft}
							>
								{card.id}
							</text>
						</svg>
					</div>
				);
			})}
			<div className="bg-brand-dark absolute top-1/2 left-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full">
				<div className="bg-brand-yellow size-1.5 rounded-full" />
			</div>
		</div>
	);
}

interface CardsWinResultProps {
	readonly prizeCard: CardId;
	readonly prizeValue: number;
}

/** The win layout — the prize card glows yellow, the rest fade out. */
function CardsWinResult({ prizeCard, prizeValue }: CardsWinResultProps) {
	const pos: Record<CardId, { cx: number; rot: number; x: number; y: number }> =
		{
			1: { cx: 75, rot: -10, x: 30, y: 30 },
			2: { cx: 150, rot: 0, x: 105, y: 22 },
			3: { cx: 225, rot: 10, x: 180, y: 30 },
		};
	return (
		<svg
			width="300"
			height="210"
			viewBox="0 0 300 210"
			fill="none"
			className="shrink-0"
		>
			{([1, 3, 2] as CardId[]).map(id => {
				const p = pos[id];
				const isPrize = id === prizeCard;
				const h = id === 2 ? 156 : 150;
				return (
					<g
						key={id}
						opacity={isPrize ? 1 : 0.3}
						transform={`translate(${p.cx},110) rotate(${p.rot}) translate(-${p.cx},-110)`}
					>
						{isPrize ? (
							<rect
								x={p.x - 5}
								y={p.y - 5}
								width={100}
								height={h + 10}
								rx="13"
								fill="none"
								stroke={PALETTE.ink}
								strokeWidth="2.5"
							/>
						) : null}
						<rect
							x={p.x}
							y={p.y}
							width="90"
							height={h}
							rx="8"
							fill={isPrize ? PALETTE.yellow : PALETTE.surfaceMuted}
							stroke={PALETTE.ink}
							strokeWidth={isPrize ? '2' : '1.5'}
						/>
						{isPrize ? (
							<>
								<text
									x={p.cx}
									y={p.y + h / 2}
									textAnchor="middle"
									fontFamily="'Clash Display',system-ui"
									fontSize="28"
									fontWeight="600"
									fill={PALETTE.ink}
								>
									+{prizeValue}
								</text>
								<text
									x={p.cx}
									y={p.y + h / 2 + 20}
									textAnchor="middle"
									fontFamily="'Geist',system-ui"
									fontSize="9"
									fontWeight="600"
									fill={PALETTE.muted}
									letterSpacing="2"
								>
									CREDITS
								</text>
							</>
						) : (
							<text
								x={p.cx}
								y={p.y + h / 2 + 8}
								textAnchor="middle"
								fontFamily="'Clash Display',system-ui"
								fontSize="22"
								fontWeight="600"
								fill={PALETTE.faint}
							>
								—
							</text>
						)}
					</g>
				);
			})}
		</svg>
	);
}

interface CardsLossResultProps {
	readonly selected: CardId;
	readonly prizeCard: CardId;
	readonly prizeValue: number;
}

/** The loss layout — your pick beside the card that actually held the prize. */
function CardsLossResult({
	selected,
	prizeCard,
	prizeValue,
}: CardsLossResultProps) {
	return (
		<div className="flex items-end gap-3">
			<div className="flex flex-col items-center gap-1.5">
				<svg width="72" height="112" viewBox="0 0 72 112" fill="none">
					<rect
						width="72"
						height="112"
						rx="8"
						fill={PALETTE.surfaceMuted}
						stroke={PALETTE.ink}
						strokeWidth="1.5"
					/>
					<text
						x="36"
						y="64"
						textAnchor="middle"
						fontFamily="'Clash Display',system-ui"
						fontSize="26"
						fontWeight="600"
						fill="#c4c4c4"
					>
						{selected}
					</text>
				</svg>
				<span className="text-ink-300 text-label-sm font-bold tracking-wider uppercase">
					Your pick
				</span>
			</div>
			<div className="text-ink-200 pb-7 text-base">→</div>
			<div className="flex flex-col items-center gap-1.5">
				<svg width="84" height="128" viewBox="0 0 84 128" fill="none">
					<rect
						width="84"
						height="128"
						rx="8"
						fill={PALETTE.yellow}
						stroke={PALETTE.ink}
						strokeWidth="2"
					/>
					<text
						x="42"
						y="70"
						textAnchor="middle"
						fontFamily="'Clash Display',system-ui"
						fontSize="28"
						fontWeight="600"
						fill={PALETTE.ink}
					>
						{prizeCard}
					</text>
					<text
						x="42"
						y="91"
						textAnchor="middle"
						fontFamily="'Geist',system-ui"
						fontSize="8"
						fontWeight="600"
						fill={PALETTE.muted}
						letterSpacing="1.5"
					>
						+{prizeValue} CREDITS
					</text>
				</svg>
				<span className="text-status-live text-label-sm font-bold tracking-wider uppercase">
					The prize
				</span>
			</div>
		</div>
	);
}

/** Header copy per phase (eyebrow is always "Mystery cards"). */
function mysteryHeader(phase: CardPhase, prizeValue: number): GameHeaderSpec {
	if (phase === 'idle') {
		return {
			eyebrow: 'Mystery cards',
			tone: 'muted',
			title: 'Trust your gut',
			titleSize: 'md',
		};
	}
	if (phase === 'flipping') {
		return {
			eyebrow: 'Mystery cards',
			tone: 'active',
			title: 'Read the deck',
			titleSize: 'md',
		};
	}
	if (phase === 'win') {
		return {
			eyebrow: 'Mystery cards',
			tone: 'win',
			title: `+${prizeValue} credits`,
			titleSize: 'lg',
		};
	}
	return {
		eyebrow: 'Mystery cards',
		tone: 'muted',
		title: LOSS_TITLE,
		titleSize: 'lg',
	};
}

interface MysteryHeroProps {
	readonly phase: CardPhase;
	readonly selected: CardId | null;
	readonly comment: string | null;
	readonly prizeCard: CardId;
	readonly prizeValue: number;
	readonly onSelect: (id: CardId) => void;
	readonly onOrbitDone: () => void;
}

/** The hero region, switched by phase. */
function MysteryHero({
	phase,
	selected,
	comment,
	prizeCard,
	prizeValue,
	onSelect,
	onOrbitDone,
}: MysteryHeroProps) {
	return (
		<GameHero>
			{phase === 'idle' ? (
				<>
					<CardsIdle selected={selected} onSelect={onSelect} />
					{comment ? (
						<div
							key={comment}
							className="hg-bubble border-brand-dark font-clash-display text-ink-900 max-w-56 rounded-2xl border-2 bg-white px-4 py-1.5 text-center text-base font-bold"
						>
							{comment}
						</div>
					) : (
						<p className="text-ink-500 text-body-sm font-medium">
							Tap a card to pick it
						</p>
					)}
				</>
			) : null}
			{phase === 'flipping' ? (
				<CardOrbit selected={selected} onDone={onOrbitDone} />
			) : null}
			{phase === 'win' ? (
				<>
					<div className="hg-p0 hg-glow-rect">
						<CardsWinResult prizeCard={prizeCard} prizeValue={prizeValue} />
					</div>
					<p className="hg-p2 font-clash-display text-ink-900 text-3xl font-semibold">
						You read the deck perfectly!
					</p>
					<div className="hg-p3">
						<ResetBlock message="Come back tomorrow for a fresh deal — another prize is hiding." />
					</div>
				</>
			) : null}
			{phase === 'loss' && selected !== null ? (
				<>
					<div className="hg-p0">
						<CardsLossResult
							selected={selected}
							prizeCard={prizeCard}
							prizeValue={prizeValue}
						/>
					</div>
					<div className="hg-p3">
						<ResetBlock message={LOSS_TITLE} large />
					</div>
				</>
			) : null}
		</GameHero>
	);
}

interface MysteryMetaProps {
	readonly phase: CardPhase;
	readonly credits: number;
	readonly selected: CardId | null;
	readonly prizeValue: number;
}

/** The status row above the CTA. */
function MysteryMeta({
	phase,
	credits,
	selected,
	prizeValue,
}: MysteryMetaProps) {
	return (
		<GameMetaBar>
			{phase === 'idle' ? (
				<>
					<span className="bg-brand-mint border-brand-dark inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold">
						1 credit
					</span>
					<Balance credits={credits} delta={-1} />
				</>
			) : null}
			{phase === 'flipping' ? (
				<>
					<span className="bg-brand-dark inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white">
						Card {selected} selected
					</span>
					<Balance credits={credits} />
				</>
			) : null}
			{phase === 'win' ? (
				<>
					<Balance credits={credits} delta={prizeValue} />
					<AddedToBalance />
				</>
			) : null}
			{phase === 'loss' ? (
				<>
					<Balance credits={credits} />
					<span className="text-ink-500 text-xs">Used 1 credit</span>
				</>
			) : null}
		</GameMetaBar>
	);
}

interface MysteryCtaProps {
	readonly phase: CardPhase;
	readonly selected: CardId | null;
	readonly canReveal: boolean;
	readonly onReveal: () => void;
	readonly onClose: () => void;
}

/** The bottom action, switched by phase. */
function MysteryCta({
	phase,
	selected,
	canReveal,
	onReveal,
	onClose,
}: MysteryCtaProps) {
	const isEnd = phase === 'win' || phase === 'loss';
	return (
		<GameCta>
			{phase === 'idle' ? (
				<Button
					type="button"
					size="lg"
					className="w-full"
					onClick={onReveal}
					disabled={!canReveal}
				>
					{canReveal ? `Reveal card ${selected}` : 'Select a card first'}
				</Button>
			) : null}
			{phase === 'flipping' ? (
				<Button
					type="button"
					size="lg"
					className="w-full"
					variant="outline"
					disabled
				>
					Revealing…
				</Button>
			) : null}
			{isEnd ? (
				<Button
					type="button"
					size="lg"
					className="hg-p5 w-full"
					variant="outline"
					onClick={onClose}
				>
					Back to games
				</Button>
			) : null}
		</GameCta>
	);
}

interface MysteryCardsGameProps {
	readonly credits: number;
	readonly setCredits: Dispatch<SetStateAction<number>>;
	readonly onClose: () => void;
}

/**
 * Pick one of three mystery cards. Costs 1 credit; the hidden prize card pays
 * out 0–2 credits. No card is pre-selected and the reveal button stays
 * disabled until one is tapped; each tap pops a playful, non-revealing nudge.
 *
 * @param credits - Current shared balance
 * @param setCredits - Balance setter (lifted to the deck)
 * @param onClose - Return to the game selection
 * @returns The mystery-cards screen
 */
export function MysteryCardsGame({
	credits,
	setCredits,
	onClose,
}: MysteryCardsGameProps) {
	const [phase, setPhase] = useState<CardPhase>('idle');
	const [selected, setSelected] = useState<CardId | null>(null);
	const [prizeCard] = useState<CardId>(
		() => Math.ceil(Math.random() * 3) as CardId,
	);
	const [prizeValue] = useState(() => Math.floor(Math.random() * 3));
	const [comment, setComment] = useState<string | null>(null);
	const { flash, isShaking, trigger } = useFlashShake();

	function pickCard(id: CardId) {
		const prev = selected;
		setSelected(id);
		sfx.cardPick();
		if (prev === null) {
			const options = FIRST_PICK[id];
			setComment(options[Math.floor(Math.random() * options.length)]);
			return;
		}
		setComment(
			prev === id
				? SAME_PICK[id]
				: SWITCH_PICK[Math.floor(Math.random() * SWITCH_PICK.length)],
		);
	}

	function resolveReveal() {
		const didWin = selected === prizeCard;
		if (didWin) {
			setCredits(c => c + prizeValue);
			setTimeout(() => sfx.win(), 150);
		} else {
			setTimeout(() => sfx.loss(), 150);
		}
		setTimeout(() => trigger(didWin ? 'win' : 'loss'), 200);
		setPhase(didWin ? 'win' : 'loss');
	}

	function handleReveal() {
		if (credits < 1 || selected === null) {
			return;
		}
		setCredits(c => c - 1);
		setComment(null);
		setPhase('flipping');
		sfx.cardReveal();
	}

	const header = mysteryHeader(phase, prizeValue);
	const canReveal = selected !== null && phase === 'idle';

	return (
		<GameScreen isShaking={isShaking} flash={flash}>
			{phase === 'win' ? <Confetti /> : null}
			<GameHeader
				{...header}
				onClose={onClose}
				closeDim={phase === 'flipping'}
			/>
			<GameDivider />
			<MysteryHero
				phase={phase}
				selected={selected}
				comment={comment}
				prizeCard={prizeCard}
				prizeValue={prizeValue}
				onSelect={pickCard}
				onOrbitDone={resolveReveal}
			/>
			<MysteryMeta
				phase={phase}
				credits={credits}
				selected={selected}
				prizeValue={prizeValue}
			/>
			<MysteryCta
				phase={phase}
				selected={selected}
				canReveal={canReveal}
				onReveal={handleReveal}
				onClose={onClose}
			/>
		</GameScreen>
	);
}
