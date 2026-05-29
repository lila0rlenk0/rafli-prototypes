'use client';

import Link from 'next/link';
import { useCallback, useState, type CSSProperties } from 'react';

import { STAGE_ENTRANCE_CLASS } from '@/components/raffle/motion-classes';
import { Button } from '@/components/ui/button';
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/class-names';

import { resolveConfirmationTier, type ConfirmationTier } from './tier';
import { TierSquares } from './tier-squares';

interface TierVisual {
	readonly headline: string;
	readonly cardBg: string;
	readonly cardSize: string;
	readonly numberSize: string;
	readonly shakeDeg: string;
}

const TIER_VISUALS: Record<ConfirmationTier, TierVisual> = {
	TIER1: {
		headline: 'Entry Confirmed!',
		cardBg: 'bg-brand-mint',
		cardSize: 'size-40',
		numberSize: 'text-30',
		shakeDeg: '5deg',
	},
	TIER2: {
		headline: "Solid play. You've stacked entries.",
		cardBg: 'bg-brand-sky',
		cardSize: 'size-44',
		numberSize: 'text-headline-lg',
		shakeDeg: '8deg',
	},
	TIER3: {
		headline: "You're all in! 🎉",
		cardBg: 'bg-brand-yellow',
		cardSize: 'size-48',
		numberSize: 'text-display-md',
		shakeDeg: '10deg',
	},
};

const PCT_FRACTION_DIGITS = 1;

/**
 * Formats the user's win odds as a percent with one fractional digit.
 *
 * @returns Percent string like "12.5%" — or "0.0%" when the pool is empty
 */
export function formatOdds(yourEntries: number, totalPool: number): string {
	if (totalPool <= 0) return '0.0%';
	return `${((yourEntries / totalPool) * 100).toFixed(PCT_FRACTION_DIGITS)}%`;
}

interface StatCellProps {
	readonly label: string;
	readonly value: string | number;
}

function StatCell({ label, value }: StatCellProps) {
	return (
		<div className="flex flex-col items-center gap-1">
			<p className="text-ink-500 text-2xs tracking-caps-3 uppercase">{label}</p>
			<p className="font-clash-display text-foreground text-30 font-semibold tabular-nums">
				{value}
			</p>
		</div>
	);
}

interface CelebrationHeaderProps {
	readonly visuals: TierVisual;
	readonly ticketQuantity: number;
	readonly raffleTitle?: string;
	readonly lockedInLine: string;
}

function CelebrationHeader({
	visuals,
	ticketQuantity,
	raffleTitle,
	lockedInLine,
}: CelebrationHeaderProps) {
	const cardStyle = {
		'--card-shake-deg': visuals.shakeDeg,
	} as CSSProperties;
	return (
		<DialogHeader className="relative z-10 flex flex-col items-center gap-6">
			<div
				style={cardStyle}
				className={cn(
					'motion-safe:animate-card-pop flex items-center justify-center rounded-3xl',
					visuals.cardBg,
					visuals.cardSize,
				)}
			>
				<span
					className={cn(
						'font-clash-display text-foreground font-semibold tabular-nums',
						visuals.numberSize,
					)}
				>
					{ticketQuantity}
				</span>
			</div>

			<div className="flex flex-col items-center gap-2">
				{raffleTitle ? (
					<p
						className={cn(
							'text-ink-500 text-2xs tracking-caps-3 uppercase',
							STAGE_ENTRANCE_CLASS,
							'motion-safe:delay-300',
						)}
					>
						{raffleTitle}
					</p>
				) : null}
				<DialogTitle
					className={cn(
						'font-clash-display text-foreground text-30 text-center font-semibold tracking-tight',
						STAGE_ENTRANCE_CLASS,
						'motion-safe:delay-400',
					)}
				>
					{visuals.headline}
				</DialogTitle>
				<DialogDescription
					className={cn(
						'text-ink-500 text-body-sm text-center',
						STAGE_ENTRANCE_CLASS,
						'motion-safe:delay-500',
					)}
				>
					{lockedInLine}
				</DialogDescription>
			</div>
		</DialogHeader>
	);
}

interface CelebrationCtaRowProps {
	readonly isParticipant: boolean;
	readonly participantHrefBase: string;
	readonly publicSlug: string;
}

function CelebrationCtaRow({
	isParticipant,
	participantHrefBase,
	publicSlug,
}: CelebrationCtaRowProps) {
	return (
		<div
			className={cn(
				'relative z-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center',
				STAGE_ENTRANCE_CLASS,
				'motion-safe:delay-700',
			)}
		>
			{isParticipant ? (
				<>
					<Button asChild size="lg" className="sm:w-56">
						<Link href={participantHrefBase}>View this sweepstake</Link>
					</Button>
					<Button asChild size="lg" variant="outline" className="sm:w-56">
						<Link href="/browse">Browse more sweepstakes</Link>
					</Button>
				</>
			) : (
				<Button asChild size="lg" variant="outline" className="sm:w-56">
					<Link href={`/browse/${publicSlug}`}>Back to sweepstakes</Link>
				</Button>
			)}
		</div>
	);
}

interface CelebrationShareRowProps {
	readonly onShare: () => void;
}

function CelebrationShareRow({ onShare }: CelebrationShareRowProps) {
	return (
		<div
			className={cn(
				'relative z-10 flex flex-col items-center gap-3',
				STAGE_ENTRANCE_CLASS,
				'motion-safe:delay-900',
			)}
		>
			<p className="text-foreground text-body-md text-center font-semibold">
				Get a free entry by spreading the word!
			</p>
			<Button onClick={onShare} size="lg" variant="outline">
				Share on X
			</Button>
		</div>
	);
}

export interface EntriesConfirmedBodyProps {
	readonly publicSlug: string;
	readonly raffleTitle?: string;
	/**
	 * Entries the user just purchased — drives tier selection, the entry-count
	 * card, and the "N entries locked in" copy.
	 */
	readonly ticketQuantity: number;
	/**
	 * Final post-purchase "Your Entries" number to display. Callers are
	 * responsible for computing this correctly for their flow:
	 *
	 * - In-page settle: pre-purchase baseline + `ticketQuantity` (router.refresh
	 *   hasn't landed when the modal opens).
	 * - Stripe-return: page-level value passed through (the route re-fetched
	 *   after redirect, so the value already reflects the purchase).
	 *
	 * The body snapshots this on mount via `useState` so subsequent parent
	 * re-renders cannot shift the figure mid-celebration.
	 */
	readonly yourEntries: number;
	/**
	 * Final post-purchase "Total in Pool" number to display. Same caller
	 * responsibility + snapshot semantics as `yourEntries`.
	 */
	readonly totalInPool: number;
	/**
	 * Base href for the "View this sweepstake" CTA. In-page path:
	 * `/my-raffles/{publicSlug}`. Stripe-return path: `/my-raffles`.
	 */
	readonly participantHrefBase: string;
	/**
	 * When false (host viewing their own raffle on Stripe return), the
	 * participant deep-link is hidden and a generic "Back to sweepstakes"
	 * fallback renders instead.
	 */
	readonly isParticipant: boolean;
}

/**
 * Inner celebration cluster — tier-keyed entry count card, headline, stats
 * panel, CTA row, and Share-on-X footer. Mounts inside an already-open
 * `DialogContent` so `useState` captures pre-celebration values reliably
 * (Radix only mounts `DialogContent` while the dialog is open).
 *
 * `yourEntries` / `totalInPool` arrive as already-computed display numbers
 * from the caller — keeps the body flow-agnostic and dodges the projection
 * bug that the in-page flow had (parent re-render mid-celebration would
 * double-count if the body did the arithmetic itself).
 *
 * @returns Tier-keyed celebration body, without the Dialog/DialogContent shell
 */
export function EntriesConfirmedBody({
	publicSlug,
	raffleTitle,
	ticketQuantity,
	yourEntries: initialYourEntries,
	totalInPool: initialTotalInPool,
	participantHrefBase,
	isParticipant,
}: EntriesConfirmedBodyProps) {
	// Snapshot the display values at mount. See module comment.
	const [yourEntries] = useState(initialYourEntries);
	const [totalInPool] = useState(initialTotalInPool);

	const tier = resolveConfirmationTier(ticketQuantity);
	const visuals = TIER_VISUALS[tier];
	const odds = formatOdds(yourEntries, totalInPool);
	const entryWord = ticketQuantity === 1 ? 'entry' : 'entries';
	const lockedInLine = raffleTitle
		? `${ticketQuantity} ${entryWord} locked in ${raffleTitle}`
		: `${ticketQuantity} ${entryWord} locked in this sweepstakes`;

	const handleShareOnX = useCallback(
		function shareOnX() {
			const text = raffleTitle
				? `Just entered ${raffleTitle} on Rafli — join me!`
				: 'Just entered this sweepstakes on Rafli — join me!';
			const link = `${window.location.origin}/browse/${publicSlug}`;
			const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
				text,
			)}&url=${encodeURIComponent(link)}`;
			window.open(url, '_blank', 'noopener,noreferrer');
		},
		[publicSlug, raffleTitle],
	);

	return (
		<>
			<TierSquares show tier={tier} />

			<CelebrationHeader
				visuals={visuals}
				ticketQuantity={ticketQuantity}
				raffleTitle={raffleTitle}
				lockedInLine={lockedInLine}
			/>

			<div
				className={cn(
					'border-border bg-card relative z-10 flex items-center justify-center gap-12 rounded-3xl border px-12 py-6',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-600',
				)}
			>
				<StatCell label="Your Entries" value={yourEntries} />
				<StatCell label="Total in Pool" value={totalInPool} />
				<StatCell label="Your Odds" value={odds} />
			</div>

			<CelebrationCtaRow
				isParticipant={isParticipant}
				participantHrefBase={participantHrefBase}
				publicSlug={publicSlug}
			/>

			<CelebrationShareRow onShare={handleShareOnX} />
		</>
	);
}
