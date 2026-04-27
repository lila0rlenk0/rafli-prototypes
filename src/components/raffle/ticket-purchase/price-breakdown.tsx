'use client';

import { formatCurrency } from '@/lib/utils/format/format-currency';

import { formatBonusEntriesLabel } from './ticket-purchase-present';

interface PriceBreakdownProps {
	/** ISO 4217 currency code. */
	readonly currency: string;
	/** Line subtotal (quantity * price) — shown only when a non-free discount applies. */
	readonly subtotal: number;
	/** Discount amount (>= 0) — shown only when positive and not a free-tickets promo. */
	readonly discount: number;
	/** Final total after discount — replaced by "FREE" when the promo is free-tickets. */
	readonly total: number;
	/** Render subtotal + discount rows. */
	readonly hasDiscount: boolean;
	/** Render the FREE label + bonus-entries caption. */
	readonly isFree: boolean;
	/** Number of bonus entries granted by a free-tickets promo. */
	readonly freeTicketCount: number;
}

/**
 * Subtotal / discount / total rows plus the free-tickets caption.
 * Purely presentational — all math is computed upstream in
 * `useTicketPurchase` via `calculateOrderTotal` so this surface stays
 * deterministic and unit-renderable.
 *
 * @param props - Currency + line amounts + discount/free flags
 * @returns Subtotal + discount rows (when applicable), total row, free caption
 */
export function PriceBreakdown({
	currency,
	subtotal,
	discount,
	total,
	hasDiscount,
	isFree,
	freeTicketCount,
}: PriceBreakdownProps) {
	// Subtotal / discount rows render only when a paid promo actually
	// reduces the price — for free-tickets the total already reads "FREE"
	// so echoing a $0 subtotal + full discount would be noise.
	const shouldShowDiscountRows = hasDiscount && !isFree;

	return (
		<>
			{shouldShowDiscountRows ? (
				<>
					<div className="flex items-center justify-between text-sm">
						<span className="text-ink-500">Subtotal</span>
						<span>{formatCurrency(subtotal, currency)}</span>
					</div>
					<div className="flex items-center justify-between text-sm text-green-600">
						<span>Discount</span>
						<span>-{formatCurrency(discount, currency)}</span>
					</div>
				</>
			) : null}

			<div className="flex items-center justify-between">
				<p className="text-ink-400 text-sm">Total</p>
				<p className="font-clash-display text-3xl font-semibold">
					{isFree ? 'FREE' : formatCurrency(total, currency)}
				</p>
			</div>

			{/* Bonus-entries caption — reframed from "free tickets" so promo
			    grants read as bonus entries, consistent with the AMOE
			    terminology used elsewhere on the page. */}
			{isFree ? (
				<p className="text-center text-sm text-green-600">
					{formatBonusEntriesLabel(freeTicketCount)}
				</p>
			) : null}
		</>
	);
}
