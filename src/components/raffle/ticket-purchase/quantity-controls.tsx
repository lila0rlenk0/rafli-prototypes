'use client';

import { formatCurrency } from '@/lib/utils/format/format-currency';
import type { RaffleSubscriptionContext } from '@/types/subscription';

import { TicketSelector } from '../ticket-selector';

interface QuantityControlsProps {
	/** Full retail per-entry price in major currency units. Drives the strikethrough. */
	readonly price: number;
	/** Subscriber-effective per-entry price — equals `price` when no subscription. */
	readonly effectiveUnitPrice: number;
	/** ISO 4217 currency code. */
	readonly currency: string;
	/** Maximum selectable quantity — 0 means unlimited. */
	readonly maxTickets: number;
	/** Current store-backed quantity — only surfaced in the mobile summary. */
	readonly ticketQuantity: number;
	/** Active subscription snapshot — drives the strikethrough + plan badge UI. */
	readonly subscription: RaffleSubscriptionContext;
}

/**
 * Quantity surface of the ticket purchase card — the per-entry price
 * header, the stepper-plus-input selector, and the mobile entry-count
 * summary. Only rendered when the order is paid; free-tickets promos
 * short-circuit this block in the parent.
 *
 * @param props - Price, currency, upper bound, current quantity, subscription state
 * @returns Per-entry price label + ticket selector + mobile summary
 */
export function QuantityControls({
	price,
	effectiveUnitPrice,
	currency,
	maxTickets,
	ticketQuantity,
	subscription,
}: QuantityControlsProps) {
	// Strikethrough renders only when the subscription actually shifts the unit
	// price — equality check covers both the no-subscription path and 0%
	// subscription tiers, so the visual stays clean when there's no real saving.
	const showSubscriberDiscount =
		subscription.isActive && effectiveUnitPrice < price;

	return (
		<>
			{/* Per-entry price — reframed from "per ticket" so the pricing line
			    reads as platform access that includes an entry, not a ticket
			    sale. Subscriber-effective price is the headline; the un-discounted
			    price renders alongside with a strikethrough so the user can see
			    the saving without doing math. */}
			<div className="flex items-center justify-between">
				<p className="text-ink-400 text-sm">Per entry</p>
				{showSubscriberDiscount ? (
					<div className="flex items-baseline gap-2">
						<span className="text-ink-400 text-sm line-through">
							{formatCurrency(price, currency)}
						</span>
						<p className="font-clash-display text-green-forest text-2xl font-semibold lg:text-3xl">
							{formatCurrency(effectiveUnitPrice, currency)}
						</p>
					</div>
				) : (
					<p className="font-clash-display text-2xl font-semibold lg:text-3xl">
						{formatCurrency(price, currency)}
					</p>
				)}
			</div>

			{/* Entry selector — quantity is owned by the shared store, so no
			    callback wiring is needed here. */}
			<TicketSelector maxTickets={maxTickets} />

			{/* Mobile entry-count summary — mirrors the desktop quantity
			    indicator since the counter input isn't visible at this scroll
			    position on mobile. */}
			<div className="flex items-center justify-between lg:hidden">
				<p className="text-ink-400 text-sm">Entries</p>
				<p className="font-clash-display text-3xl font-semibold">
					{ticketQuantity}
				</p>
			</div>
		</>
	);
}
