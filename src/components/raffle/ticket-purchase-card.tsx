'use client';

import { useState } from 'react';

import { BuyButton } from '@/app/(protected)/browse/[publicSlug]/buy-button';
import { Separator } from '@/components/ui/separator';
import { TicketSelector } from './ticket-selector';

interface TicketPurchaseCardProps {
	raffleId: string;
	publicSlug: string;
	price: number;
	currency: string;
	availableTickets: number;
	disabled?: boolean;
	questionId?: string | null;
}

/**
 * TicketPurchaseCard Component
 *
 * Orchestrates the ticket purchase flow by managing the ticket quantity state
 * and coordinating between the TicketSelector and BuyButton components.
 *
 * Displays:
 * - Price per ticket
 * - Ticket quantity selector with +/- and bundle buttons
 * - Total price calculation
 * - Purchase button with selected quantity
 *
 * The component manages shared state for ticket quantity and passes it to both
 * the selector (for display) and buy button (for order creation).
 */
export function TicketPurchaseCard({
	raffleId,
	publicSlug,
	price,
	currency,
	availableTickets,
	disabled = false,
	questionId,
}: TicketPurchaseCardProps) {
	const [ticketQuantity, setTicketQuantity] = useState(1);

	/**
	 * Formats a price value with currency symbol
	 * @param amount - The price amount
	 * @param currencyCode - Currency code (e.g., "USD", "EUR")
	 * @returns Formatted price string (e.g., "$15.00")
	 */
	function formatPrice(amount: number, currencyCode: string): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currencyCode,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		}).format(amount);
	}

	/**
	 * Calculates the total price for selected tickets
	 * @param quantity - Number of tickets
	 * @param pricePerTicket - Price of one ticket
	 * @returns Total price
	 */
	function calculateTotalPrice(
		quantity: number,
		pricePerTicket: number,
	): number {
		return quantity * pricePerTicket;
	}

	const maxTickets = availableTickets;
	const formattedPrice = formatPrice(price, currency);
	const totalPrice = calculateTotalPrice(ticketQuantity, price);
	const formattedTotal = formatPrice(totalPrice, currency);

	return (
		<div className="mt-6 space-y-4">
			{/* Price per ticket */}
			<div className="flex items-center justify-between">
				<div className="-mb-4 flex items-baseline gap-1">
					<p className="font-clash-display text-3xl font-semibold">
						{formattedPrice}
					</p>
					<p className="text-sm text-[#7B7B7B]">per ticket</p>
				</div>
			</div>

			{/* Ticket selector */}
			<TicketSelector
				maxTickets={maxTickets}
				onQuantityChange={setTicketQuantity}
			/>

			<Separator className="my-4 bg-[#B4B4B4]" />

			{/* Total price */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-[#7B7B7B]">Total</p>
				<p className="font-clash-display text-3xl font-semibold">
					{formattedTotal}
				</p>
			</div>

			{/* Buy button */}
			<BuyButton
				raffleId={raffleId}
				publicSlug={publicSlug}
				ticketQuantity={ticketQuantity}
				disabled={disabled}
				questionId={questionId}
			/>
		</div>
	);
}
