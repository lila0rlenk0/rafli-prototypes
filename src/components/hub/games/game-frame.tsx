import { CircleCheck, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import { NEXT_FREE_PLAY } from './games-content';
import type { FlashType } from './use-flash-shake';

/** Eyebrow colour by game moment. */
const EYEBROW_TONE = {
	muted: 'text-ink-500',
	active: 'text-ink-900',
	win: 'text-status-live',
} as const;

interface FlashOverlayProps {
	readonly flash: FlashType | null;
}

/**
 * Full-screen colour wash over the game on a resolved outcome — yellow for a
 * win, sky for a loss. Renders nothing while idle.
 *
 * @param flash - Active flash type, or null
 * @returns The flash layer or null
 */
export function FlashOverlay({ flash }: FlashOverlayProps) {
	if (!flash) {
		return null;
	}
	return (
		<div
			aria-hidden
			className={cn(
				'hg-flash pointer-events-none absolute inset-0 z-50 rounded-2xl',
				flash === 'win' ? 'bg-brand-yellow' : 'bg-brand-sky',
			)}
		/>
	);
}

interface GameScreenProps {
	readonly isShaking: boolean;
	readonly flash: FlashType | null;
	readonly children: ReactNode;
}

/**
 * The neo-brutalist game "screen" — a flex column with the entrance animation,
 * the loss shake, and the flash overlay already wired in. Each game fills it
 * with a header, hero, meta bar, and CTA stack.
 *
 * @param isShaking - Whether the loss shake is active
 * @param flash - Active flash wash
 * @param children - Game body
 * @returns The screen container
 */
export function GameScreen({ isShaking, flash, children }: GameScreenProps) {
	return (
		<div
			className={cn(
				'hg-screen relative flex flex-col overflow-hidden',
				isShaking && 'hg-shaking',
			)}
		>
			<FlashOverlay flash={flash} />
			{children}
		</div>
	);
}

interface GameCloseProps {
	readonly onClose: () => void;
	/** Dim + disable mid-play (e.g. while the coin is spinning). */
	readonly dim?: boolean;
}

/**
 * The top-right close control. Dims and stops responding mid-play so a user
 * can't bail out of an in-flight animation.
 *
 * @param onClose - Close handler
 * @param dim - Whether to dim/disable the control
 * @returns The close button
 */
export function GameClose({ onClose, dim = false }: GameCloseProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			aria-label="Close game"
			onClick={onClose}
			className={cn(
				'bg-ink-150 hover:bg-ink-200 relative z-10 shrink-0',
				dim && 'pointer-events-none opacity-30',
			)}
		>
			<X />
		</Button>
	);
}

/** The per-phase header copy each game computes and spreads into GameHeader. */
export interface GameHeaderSpec {
	readonly eyebrow: string;
	readonly tone: keyof typeof EYEBROW_TONE;
	readonly title: string;
	/** `lg` is the oversized win/loss headline. */
	readonly titleSize: 'md' | 'lg';
}

interface GameHeaderProps extends GameHeaderSpec {
	readonly onClose: () => void;
	readonly closeDim?: boolean;
}

/**
 * Shared header — eyebrow + Clash Display title on the left, close on the
 * right.
 *
 * @returns The game header row
 */
export function GameHeader({
	eyebrow,
	tone,
	title,
	titleSize,
	onClose,
	closeDim,
}: GameHeaderProps) {
	return (
		<div className="relative z-10 flex items-start justify-between px-8 pt-8">
			<div className="flex flex-col gap-1.5">
				<span
					className={cn(
						'text-label-sm font-semibold tracking-wider uppercase',
						EYEBROW_TONE[tone],
					)}
				>
					{eyebrow}
				</span>
				<h2
					className={cn(
						'font-clash-display text-ink-900 font-semibold',
						titleSize === 'lg' ? 'text-4xl' : 'text-2xl',
					)}
				>
					{title}
				</h2>
			</div>
			<GameClose onClose={onClose} dim={closeDim} />
		</div>
	);
}

/** A 2px ink rule separating the header from the hero. */
export function GameDivider() {
	return <div className="bg-brand-dark mx-8 mt-4 h-0.5 shrink-0" />;
}

interface GameHeroProps {
	readonly children: ReactNode;
}

/** The centred play area that grows to fill the screen. */
export function GameHero({ children }: GameHeroProps) {
	return (
		<div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 px-8 py-4">
			{children}
		</div>
	);
}

interface GameMetaBarProps {
	readonly children: ReactNode;
}

/** The status row above the CTA — pill on the left, balance on the right. */
export function GameMetaBar({ children }: GameMetaBarProps) {
	return (
		<div className="relative z-10 flex items-center justify-between px-8 pb-3.5">
			{children}
		</div>
	);
}

interface GameCtaProps {
	readonly children: ReactNode;
}

/** The bottom action stack. */
export function GameCta({ children }: GameCtaProps) {
	return (
		<div className="relative z-10 flex flex-col gap-2.5 px-8 pb-8">
			{children}
		</div>
	);
}

interface BalanceProps {
	readonly credits: number;
	/** Signed delta chip, e.g. +2 (win) or −1 (cost). */
	readonly delta?: number;
}

/**
 * The live credit balance. The number re-mounts on every change (via `key`)
 * so the pop animation replays.
 *
 * @returns The balance display
 */
export function Balance({ credits, delta }: BalanceProps) {
	return (
		<div className="flex items-baseline gap-1">
			<span
				key={credits}
				className="hg-cred-pop font-clash-display text-ink-900 text-lg font-semibold"
			>
				{credits}
			</span>
			<span className="text-ink-500 text-xs">credits</span>
			{delta !== undefined ? (
				<span
					className={cn(
						'ml-1 text-sm font-bold',
						delta >= 0 ? 'text-status-live' : 'text-destructive',
					)}
				>
					{delta >= 0 ? `+${delta}` : delta}
				</span>
			) : null}
		</div>
	);
}

/** The "Added to balance" confirmation line shown on a win. */
export function AddedToBalance() {
	return (
		<p className="text-status-live flex items-center gap-1 text-xs font-semibold">
			<CircleCheck className="size-3.5" />
			Added to balance
		</p>
	);
}

interface ResetBlockProps {
	readonly message: string;
	/** Render the message as the oversized loss headline. */
	readonly large?: boolean;
}

/**
 * The "come back tomorrow" block with the cosmetic reset countdown shown on
 * every end state.
 *
 * @returns The daily-reset block
 */
export function ResetBlock({ message, large = false }: ResetBlockProps) {
	return (
		<div className="flex flex-col items-center gap-1.5 text-center">
			<p
				className={cn(
					large
						? 'font-clash-display text-ink-900 text-3xl font-semibold'
						: 'text-ink-500 text-body-sm max-w-sm',
				)}
			>
				{message}
			</p>
			<div>
				<p className="text-ink-500 text-label-sm font-semibold tracking-wider uppercase">
					Next free play in
				</p>
				<p className="font-clash-display text-ink-900 text-2xl font-semibold">
					{NEXT_FREE_PLAY}
				</p>
			</div>
		</div>
	);
}
