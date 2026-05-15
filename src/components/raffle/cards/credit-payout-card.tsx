import { Wallet } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import {
	computePayoutAmountPerWinner,
	computePlatformFee,
	computeTotalDistributed,
	formatCredits,
} from '@/lib/utils/raffle/partial-participation';
import type { Raffle } from '@/types/raffle';

interface CreditPayoutCardProps {
	raffle: Raffle;
	/** Viewer role — drives the personalised footer copy. */
	viewer: 'winner' | 'host' | 'other';
}

/**
 * Shown on a concluded raffle that fell below its `minParticipants` threshold.
 * The backend draw produced winners, but the prize was distributed as Rafli
 * credits instead of the original item — 99% of revenue split equally across
 * positions, 1% retained as platform fee.
 *
 * Render contract:
 * - Insert above the existing prize / winner / host blocks; this card carries
 *   the headline; the rest of the right column stays unchanged.
 * - Math mirrors backend `computePayoutAmountPerWinner` exactly (BigInt at
 *   MONEY_SCALE=4) so the displayed per-winner amount equals the granted
 *   credit ledger entry to the dust unit.
 */
export function CreditPayoutCard({ raffle, viewer }: CreditPayoutCardProps) {
	const perWinner = computePayoutAmountPerWinner(
		raffle.revenueAmount,
		raffle.numberOfWinners,
	);
	const totalDistributed =
		perWinner !== null
			? computeTotalDistributed(perWinner, raffle.numberOfWinners)
			: null;
	const platformFee =
		totalDistributed !== null
			? computePlatformFee(raffle.revenueAmount, totalDistributed)
			: null;

	// Defensive null check — `computePayoutAmountPerWinner` returns null only on
	// malformed inputs (non-numeric revenue, non-positive winner count). Backend
	// guarantees neither, so this path is unreachable in practice; we render a
	// minimal explainer rather than crash if the wire ever drifts.
	if (perWinner === null || totalDistributed === null || platformFee === null) {
		return (
			<div className="rounded-2xl border border-black bg-white p-6">
				<h2 className="text-center text-lg font-semibold">
					Paid in Rafli Credits
				</h2>
				<p className="text-ink-500 mt-2 text-center text-sm">
					This sweepstakes paid winners in platform credits.
				</p>
			</div>
		);
	}

	const currency = raffle.ticketPriceCurrency;
	const isZeroRevenue = parseFloat(raffle.revenueAmount) === 0;

	return (
		<div className="rounded-2xl border border-black bg-white p-6">
			<div className="flex flex-col gap-4">
				{/* Header strip — Wallet icon matches the navbar credit-balance
				    affordance so users connect "credits" here with the balance
				    they already see in the nav. */}
				<div className="flex items-center justify-center gap-2">
					<Wallet className="size-5" aria-hidden />
					<h2 className="text-lg font-semibold">Paid in Rafli Credits</h2>
				</div>

				{/* Viewer-personalised callout — winners get the prominent "you
				    received X" pill first, hosts get the "0 earnings" note, others
				    see no personalised footer (the breakdown alone is enough). */}
				{viewer === 'winner' ? (
					<div className="bg-brand-sky rounded-lg px-4 py-3">
						<div className="flex justify-between text-sm">
							<span className="font-semibold">You received</span>
							<span className="font-semibold">
								{formatCredits(perWinner)} credits
							</span>
						</div>
						<p className="text-ink-500 mt-1 text-xs">
							Added to your Rafli credit balance — usable on any future
							sweepstakes.
						</p>
					</div>
				) : null}

				{/* Why this happened — same explanation for every viewer so the
				    breakdown numbers land in context. */}
				<p className="text-ink-500 text-sm">
					{isZeroRevenue ? (
						<>
							This sweepstakes didn&apos;t reach its minimum of{' '}
							<strong>{raffle.minParticipants} participants</strong>. No revenue
							was collected, so no credits were granted.
						</>
					) : (
						<>
							This sweepstakes didn&apos;t reach its minimum of{' '}
							<strong>{raffle.minParticipants} participants</strong>. The{' '}
							<strong>{raffle.numberOfWinners} winners</strong> each receive an
							equal share of the revenue as Rafli credits instead of the
							original prize.
						</>
					)}
				</p>

				{/* Breakdown — mirrors the layout used by RevenueBreakdownCard /
				    PrizeBreakdownCard so the surface stays visually consistent
				    even though the math is different. */}
				<div className="flex flex-col gap-2">
					<div className="flex justify-between text-sm">
						<span className="text-ink-500">Total Revenue</span>
						<span className="font-medium">
							{formatCurrency(raffle.revenueAmount, currency)}
						</span>
					</div>

					<div className="flex justify-between text-sm">
						<span className="text-ink-500">Platform Fee (1%)</span>
						<span className="font-medium">
							-{formatCurrency(platformFee, currency)}
						</span>
					</div>

					<div className="flex justify-between text-sm">
						<span className="text-ink-500">Distributed as Credits</span>
						<span className="font-medium">
							{formatCurrency(totalDistributed, currency)}
						</span>
					</div>
				</div>

				<Separator className="bg-ink-300" />

				<div className="flex justify-between text-sm">
					<span className="font-semibold">Per Winner</span>
					<span className="font-semibold">
						{formatCredits(perWinner)} credits
					</span>
				</div>

				{viewer === 'host' && !isZeroRevenue ? (
					<p className="text-ink-500 text-xs">
						Winners were paid from this draw&apos;s revenue. Your earnings for
						this draw are 0.
					</p>
				) : null}
			</div>
		</div>
	);
}
