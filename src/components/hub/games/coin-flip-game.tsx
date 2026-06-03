'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

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
} from './game-frame';
import { type GameOutcome, LOSS_TITLE, PALETTE } from './games-content';
import { sfx } from './sfx';
import { useFlashShake } from './use-flash-shake';

type CoinSide = 'heads' | 'tails';
type CoinPhase = 'idle' | 'spinning' | 'win' | 'loss';

/** Credits a win pays out (2× the 1-credit stake). */
const WIN_AWARD = 2;
/** Suspense words cycled while the coin is in the air. */
const SPIN_WORDS = [
	'HEADS?',
	'TAILS?',
	'HEADS?',
	'TAILS?',
	'HEADS?',
	'TAILS?',
	'……',
	'HEADS?',
	'TAILS?',
] as const;

interface CoinFaceProps {
	readonly side?: CoinSide;
}

/** A coin face — yellow heads / sky tails, both stamped RAFLI. */
function CoinFace({ side = 'heads' }: CoinFaceProps) {
	const isTails = side === 'tails';
	return (
		<svg width="160" height="160" viewBox="0 0 160 160" fill="none">
			<circle
				cx="80"
				cy="80"
				r="74"
				fill={isTails ? PALETTE.sky : PALETTE.yellow}
				stroke={PALETTE.ink}
				strokeWidth="3"
			/>
			<circle
				cx="80"
				cy="80"
				r="60"
				fill="none"
				stroke={PALETTE.ink}
				strokeWidth="1.5"
				strokeDasharray="4 3.5"
			/>
			<text
				x="80"
				y="77"
				textAnchor="middle"
				fontFamily="'Clash Display',system-ui"
				fontSize="22"
				fontWeight="600"
				fill="rgba(20,20,22,.6)"
			>
				{isTails ? 'TAILS' : 'HEADS'}
			</text>
			<text
				x="80"
				y="96"
				textAnchor="middle"
				fontFamily="'Geist',system-ui"
				fontSize="9"
				fontWeight="600"
				fill="rgba(20,20,22,.35)"
				letterSpacing="3"
			>
				RAFLI
			</text>
		</svg>
	);
}

/** The 2× winning coin face. */
function WinCoin() {
	return (
		<svg width="160" height="160" viewBox="0 0 160 160" fill="none">
			<circle
				cx="80"
				cy="80"
				r="74"
				fill={PALETTE.yellow}
				stroke={PALETTE.ink}
				strokeWidth="3"
			/>
			<circle
				cx="80"
				cy="80"
				r="60"
				fill="none"
				stroke={PALETTE.ink}
				strokeWidth="1.5"
				strokeDasharray="4 3.5"
			/>
			<text
				x="80"
				y="74"
				textAnchor="middle"
				fontFamily="'Clash Display',system-ui"
				fontSize="30"
				fontWeight="600"
				fill={PALETTE.ink}
			>
				2×
			</text>
			<text
				x="80"
				y="95"
				textAnchor="middle"
				fontFamily="'Geist',system-ui"
				fontSize="9"
				fontWeight="600"
				fill={PALETTE.ink}
				letterSpacing="3.5"
			>
				RAFLI
			</text>
		</svg>
	);
}

interface LossCoinProps {
	readonly choice: CoinSide;
}

/** A muted coin showing the side the player picked. */
function LossCoin({ choice }: LossCoinProps) {
	return (
		<svg width="160" height="160" viewBox="0 0 160 160" fill="none">
			<circle
				cx="80"
				cy="80"
				r="74"
				fill={PALETTE.sky}
				stroke={PALETTE.ink}
				strokeWidth="2"
			/>
			<circle
				cx="80"
				cy="80"
				r="60"
				fill="none"
				stroke={PALETTE.ink}
				strokeWidth="1"
				strokeDasharray="4 3.5"
			/>
			<text
				x="80"
				y="74"
				textAnchor="middle"
				fontFamily="'Clash Display',system-ui"
				fontSize="22"
				fontWeight="600"
				fill="#9b9b9b"
			>
				{choice.toUpperCase()}
			</text>
			<text
				x="80"
				y="95"
				textAnchor="middle"
				fontFamily="'Geist',system-ui"
				fontSize="9"
				fontWeight="600"
				fill={PALETTE.faint}
				letterSpacing="3.5"
			>
				RAFLI
			</text>
		</svg>
	);
}

/**
 * Resolves the header copy for a coin-flip phase. Kept as guard clauses so the
 * JSX stays free of nested ternaries.
 *
 * @returns The eyebrow/title spec for the header
 */
function coinHeader(phase: CoinPhase, choiceLabel: string): GameHeaderSpec {
	if (phase === 'idle') {
		return {
			eyebrow: 'Double or nothing',
			tone: 'muted',
			title: 'Trust the flip',
			titleSize: 'md',
		};
	}
	if (phase === 'spinning') {
		return {
			eyebrow: 'Flipping…',
			tone: 'active',
			title: `${choiceLabel} picked`,
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
		eyebrow: 'Coin flip',
		tone: 'muted',
		title: LOSS_TITLE,
		titleSize: 'lg',
	};
}

interface CoinHeroProps {
	readonly phase: CoinPhase;
	readonly choice: CoinSide;
	readonly outcome: CoinSide;
	readonly spinWord: string;
	readonly onChoose: (side: CoinSide) => void;
}

/** The central play area, switched by phase. */
function CoinHero({
	phase,
	choice,
	outcome,
	spinWord,
	onChoose,
}: CoinHeroProps) {
	return (
		<GameHero>
			{phase === 'idle' ? (
				<>
					<div key={choice} className="hg-coin-face-in shrink-0">
						<CoinFace side={choice} />
					</div>
					<div className="flex w-64 gap-2">
						<Button
							type="button"
							variant={choice === 'heads' ? 'default' : 'outline'}
							className="flex-1"
							onClick={() => onChoose('heads')}
						>
							Heads
						</Button>
						<Button
							type="button"
							variant={choice === 'tails' ? 'default' : 'outline'}
							className="flex-1"
							onClick={() => onChoose('tails')}
						>
							Tails
						</Button>
					</div>
				</>
			) : null}

			{phase === 'spinning' ? (
				<>
					<div className="hg-coin3d is-spinning">
						<div className="hg-coin3d-inner">
							<div className="hg-coin3d-face">
								<CoinFace />
							</div>
							<div className="hg-coin3d-face hg-coin3d-back">
								<CoinFace side="tails" />
							</div>
						</div>
					</div>
					<p
						key={spinWord}
						className="hg-coin-face-in font-clash-display text-ink-900 text-lg font-bold tracking-wide"
					>
						{spinWord}
					</p>
				</>
			) : null}

			{phase === 'win' ? (
				<>
					<div className="hg-p0 hg-glow-circle">
						<WinCoin />
					</div>
					<p className="hg-p1 font-clash-display text-ink-900 text-3xl font-semibold">
						You called it!
					</p>
					<p className="hg-p2 text-ink-500 text-body-sm text-center">
						Double or nothing — and you doubled! See you tomorrow 🎉
					</p>
				</>
			) : null}

			{phase === 'loss' ? (
				<>
					<div className="hg-p0">
						<LossCoin choice={choice} />
					</div>
					<p className="hg-p2 text-ink-500 text-xs font-semibold">
						You picked {choice} · it landed {outcome}
					</p>
					<p className="hg-p3 font-clash-display text-ink-900 text-3xl font-semibold">
						{LOSS_TITLE}
					</p>
				</>
			) : null}
		</GameHero>
	);
}

interface CoinMetaProps {
	readonly phase: CoinPhase;
	readonly credits: number;
	readonly choiceLabel: string;
}

/** The status row above the CTA, switched by phase. */
function CoinMeta({ phase, credits, choiceLabel }: CoinMetaProps) {
	return (
		<GameMetaBar>
			{phase === 'idle' ? (
				<>
					<span className="bg-brand-sky border-brand-dark inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold">
						1 credit
					</span>
					<Balance credits={credits} delta={-1} />
				</>
			) : null}
			{phase === 'spinning' ? (
				<>
					<span className="bg-brand-dark inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white">
						{choiceLabel} picked
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
					<span className="text-ink-500 text-xs">Used 1 credit</span>
				</>
			) : null}
		</GameMetaBar>
	);
}

interface CoinCtaProps {
	readonly phase: CoinPhase;
	readonly credits: number;
	readonly onFlip: () => void;
	readonly onContinue: () => void;
}

/** The bottom action, switched by phase. */
function CoinCta({ phase, credits, onFlip, onContinue }: CoinCtaProps) {
	const isEnd = phase === 'win' || phase === 'loss';
	return (
		<GameCta>
			{phase === 'idle' ? (
				<Button
					type="button"
					size="lg"
					className="w-full"
					onClick={onFlip}
					disabled={credits < 1}
				>
					Flip the coin
				</Button>
			) : null}
			{phase === 'spinning' ? (
				<Button
					type="button"
					size="lg"
					className="w-full"
					variant="outline"
					disabled
				>
					Wait for it…
				</Button>
			) : null}
			{isEnd ? (
				<Button
					type="button"
					size="lg"
					className={cn('w-full', phase === 'win' && 'hg-p5')}
					onClick={onContinue}
				>
					Continue
				</Button>
			) : null}
		</GameCta>
	);
}

interface CoinFlipGameProps {
	readonly credits: number;
	readonly setCredits: Dispatch<SetStateAction<number>>;
	readonly onComplete: (outcome: GameOutcome) => void;
	readonly onClose: () => void;
}

/**
 * Double-or-nothing coin flip. Costs 1 credit to play; a correct call pays 2.
 * The outcome is pre-rolled but hidden — both faces alternate during the spin
 * and only resolve as the coin decelerates, so the player never sees the
 * result early.
 *
 * @param credits - Current shared balance
 * @param setCredits - Balance setter (lifted to the deck)
 * @param onComplete - Report the resolved outcome to the deck
 * @param onClose - Return to the game selection
 * @returns The coin-flip screen
 */
export function CoinFlipGame({
	credits,
	setCredits,
	onComplete,
	onClose,
}: CoinFlipGameProps) {
	const [phase, setPhase] = useState<CoinPhase>('idle');
	const [choice, setChoice] = useState<CoinSide>('heads');
	const [outcome] = useState<CoinSide>(() =>
		Math.random() > 0.5 ? 'heads' : 'tails',
	);
	const [spinWord, setSpinWord] = useState<string>('HEADS?');
	const { flash, isShaking, trigger } = useFlashShake();
	const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const wordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

	function resolveFlip() {
		if (wordTimer.current) {
			clearInterval(wordTimer.current);
		}
		sfx.coinLand();
		const didWin = choice === outcome;
		if (didWin) {
			setCredits(c => c + WIN_AWARD);
			setTimeout(() => sfx.win(), 200);
		} else {
			setTimeout(() => sfx.loss(), 200);
		}
		setTimeout(() => trigger(didWin ? 'win' : 'loss'), 180);
		setPhase(didWin ? 'win' : 'loss');
	}

	function handleFlip() {
		if (credits < 1) {
			return;
		}
		setCredits(c => c - 1);
		setPhase('spinning');
		sfx.coinSpin();
		let wi = 0;
		wordTimer.current = setInterval(() => {
			setSpinWord(SPIN_WORDS[wi % SPIN_WORDS.length]);
			wi += 1;
		}, 310);
		landTimer.current = setTimeout(resolveFlip, 2850);
	}

	// mount: clear any in-flight spin timers on unmount.
	useEffect(() => {
		return () => {
			if (landTimer.current) {
				clearTimeout(landTimer.current);
			}
			if (wordTimer.current) {
				clearInterval(wordTimer.current);
			}
		};
	}, []);

	function handleContinue() {
		const won = phase === 'win';
		onComplete({ won, award: won ? WIN_AWARD : 0 });
	}

	const choiceLabel = choice === 'heads' ? 'Heads' : 'Tails';
	const header = coinHeader(phase, choiceLabel);

	return (
		<GameScreen isShaking={isShaking} flash={flash}>
			{phase === 'win' ? <Confetti /> : null}
			<GameHeader
				{...header}
				onClose={onClose}
				closeDim={phase === 'spinning'}
			/>
			<GameDivider />
			<CoinHero
				phase={phase}
				choice={choice}
				outcome={outcome}
				spinWord={spinWord}
				onChoose={setChoice}
			/>
			<CoinMeta phase={phase} credits={credits} choiceLabel={choiceLabel} />
			<CoinCta
				phase={phase}
				credits={credits}
				onFlip={handleFlip}
				onContinue={handleContinue}
			/>
		</GameScreen>
	);
}
