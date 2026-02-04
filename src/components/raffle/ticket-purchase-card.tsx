'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { BuyButton } from '@/app/(public)/browse/[publicSlug]/buy-button';
import { PromoCodeInput } from '@/components/promo-code/promo-code-input';
import { Separator } from '@/components/ui/separator';
import {
	PROMO_CODE_TYPE,
	type ValidatedPromoCode,
} from '@/types/promo-code';

import { SignInToBuyButton } from './sign-in-button';
import { TicketSelector } from './ticket-selector';

/**
 * Props for TicketPurchaseCard
 */
interface TicketPurchaseCardProps {
	raffleId: string;
	publicSlug: string;
	price: number;
	currency: string;
	availableTickets: number;
	disabled?: boolean;
	questionId?: string | null;
	isAuthenticated?: boolean;
}

/**
 * TicketPurchaseCard Component
 *
 * Orchestrates the ticket purchase flow by managing the ticket quantity state
 * and coordinating between the TicketSelector, PromoCodeInput, and BuyButton.
 *
 * Displays:
 * - Price per ticket
 * - Ticket quantity selector with +/- and bundle buttons
 * - Promo code input with validation
 * - Total price calculation with discount breakdown
 * - Purchase button with selected quantity
 */
export function TicketPurchaseCard({
	raffleId,
	publicSlug,
	price,
	currency,
	availableTickets,
	disabled = false,
	questionId,
	isAuthenticated = true,
}: TicketPurchaseCardProps) {
	const searchParams = useSearchParams();
	// Only use code if non-empty (handles ?code= edge case)
	const codeParam = searchParams.get('code');
	const initialCode = codeParam?.trim() || undefined;

	const [ticketQuantity, setTicketQuantity] = useState(1);
	const [appliedPromo, setAppliedPromo] = useState<ValidatedPromoCode | null>(null);

	/**
	 * Formats a price value with currency symbol
	 * @param amount - The price amount
	 * @param currencyCode - Currency code (e.g., "USD")
	 * @returns Formatted price string
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
	 * Calculates the subtotal (before discount)
	 * @returns Subtotal price
	 */
	function calculateSubtotal(): number {
		return ticketQuantity * price;
	}

	/**
	 * Calculates discount amount based on promo type
	 *
	 * Backend returns:
	 * - discount_percent: per-ticket discount amount (NOT the percentage)
	 * - discount_fixed: total fixed discount amount
	 * - free_tickets: number of tickets
	 *
	 * @returns Discount amount in currency units
	 */
	function calculateDiscount(): number {
		if (!appliedPromo) return 0;

		const promoValue = parseFloat(appliedPromo.value);
		const subtotal = calculateSubtotal();

		switch (appliedPromo.type) {
			case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
				// value is per-ticket discount, multiply by quantity
				return Math.min(promoValue * ticketQuantity, subtotal);
			case PROMO_CODE_TYPE.DISCOUNT_FIXED:
				// value is total fixed discount, cap at subtotal
				return Math.min(promoValue, subtotal);
			case PROMO_CODE_TYPE.FREE_TICKETS:
				return subtotal; // Full discount for free tickets
			default:
				return 0;
		}
	}

	/**
	 * Calculates final total after discount
	 * @returns Final total price
	 */
	function calculateTotal(): number {
		return Math.max(0, calculateSubtotal() - calculateDiscount());
	}

	/**
	 * Checks if current promo is free tickets type
	 * @returns True if promo grants free tickets
	 */
	function isFreeTicketsPromo(): boolean {
		return appliedPromo?.type === PROMO_CODE_TYPE.FREE_TICKETS;
	}

	/**
	 * Gets the ticket quantity for free tickets promo
	 * @returns Number of free tickets from promo
	 */
	function getFreeTicketCount(): number {
		if (!isFreeTicketsPromo() || !appliedPromo) return 0;
		return Math.floor(parseFloat(appliedPromo.value));
	}

	/**
	 * Handles valid promo code
	 * @param promo - The validated promo code
	 */
	function handleValidPromo(promo: ValidatedPromoCode) {
		setAppliedPromo(promo);

		// For free tickets, set quantity to match the promo value
		if (promo.type === PROMO_CODE_TYPE.FREE_TICKETS) {
			const freeCount = Math.floor(parseFloat(promo.value));
			setTicketQuantity(freeCount);
		}
	}

	/**
	 * Handles promo code removal
	 */
	function handleClearPromo() {
		setAppliedPromo(null);
		setTicketQuantity(1);
	}

	const maxTickets = availableTickets;
	const subtotal = calculateSubtotal();
	const discount = calculateDiscount();
	const total = calculateTotal();
	const hasDiscount = discount > 0;
	const isFree = isFreeTicketsPromo();

	return (
		<div className="mt-6 space-y-4">
			{/* Price per ticket - hide for free tickets */}
			{!isFree && (
				<div className="flex items-center justify-between">
					<div className="-mb-4 flex items-baseline gap-1">
						<p className="font-clash-display text-3xl font-semibold">
							{formatPrice(price, currency)}
						</p>
						<p className="text-sm text-[#7B7B7B]">per ticket</p>
					</div>
				</div>
			)}

			{/* Ticket selector - hide for free tickets */}
			{!isFree && (
				<TicketSelector
					maxTickets={maxTickets}
					onQuantityChange={setTicketQuantity}
				/>
			)}

			{/* Promo code input */}
			<PromoCodeInput
				raffleId={raffleId}
				onValidCode={handleValidPromo}
				onClear={handleClearPromo}
				disabled={disabled}
				initialCode={initialCode}
			/>

			<Separator className="my-4 bg-[#B4B4B4]" />

			{/* Price breakdown */}
			{hasDiscount && !isFree && (
				<>
					<div className="flex items-center justify-between text-sm">
						<span className="text-[#7B7B7B]">Subtotal</span>
						<span>{formatPrice(subtotal, currency)}</span>
					</div>
					<div className="flex items-center justify-between text-sm text-green-600">
						<span>Discount</span>
						<span>-{formatPrice(discount, currency)}</span>
					</div>
				</>
			)}

			{/* Total price */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-[#7B7B7B]">Total</p>
				<p className="font-clash-display text-3xl font-semibold">
					{isFree ? 'FREE' : formatPrice(total, currency)}
				</p>
			</div>

			{/* Free tickets info */}
			{isFree && (
				<p className="text-center text-sm text-green-600">
					{getFreeTicketCount()} free ticket{getFreeTicketCount() !== 1 ? 's' : ''} with this code
				</p>
			)}

			{/* Buy button or Sign In button */}
			{isAuthenticated ? (
				<BuyButton
					raffleId={raffleId}
					publicSlug={publicSlug}
					ticketQuantity={isFree ? getFreeTicketCount() : ticketQuantity}
					disabled={disabled}
					questionId={questionId}
					promoCode={appliedPromo?.code}
					isFreeTickets={isFree}
				/>
			) : (
				<SignInToBuyButton />
			)}
		</div>
	);
}
