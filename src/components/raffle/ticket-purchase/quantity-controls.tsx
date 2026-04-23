'use client';

import { formatPrice } from '@/lib/checkout/calculate-order-total';

import { TicketSelector } from '../ticket-selector';

interface QuantityControlsProps {
	/** Per-entry price in major currency units. */
	readonly price: number;
	/** ISO 4217 currency code. */
	readonly currency: string;
	/** Maximum selectable quantity — 0 means unlimited. */
	readonly maxTickets: number;
	/** Current store-backed quantity — only surfaced in the mobile summary. */
	readonly ticketQuantity: number;
}

/**
 * Quantity surface of the ticket purchase card — the per-entry price
 * header, the stepper-plus-input selector, and the mobile entry-count
 * summary. Only rendered when the order is paid; free-tickets promos
 * short-circuit this block in the parent.
 *
 * @param props - Price, currency, upper bound, and current quantity
 * @returns Per-entry price label + ticket selector + mobile summary
 */
export function QuantityControls({
	price,
	currency,
	maxTickets,
	ticketQuantity,
}: QuantityControlsProps) {
	return (
		<>
			{/* Per-entry price — reframed from "per ticket" so the pricing line
			    reads as platform access that includes an entry, not a ticket
			    sale. */}
			<div className="flex items-center justify-between">
				<p className="text-ink-400 text-sm">Per entry</p>
				<p className="font-clash-display text-2xl font-semibold lg:text-3xl">
					{formatPrice(price, currency)}
				</p>
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
