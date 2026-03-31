'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { BuyButton } from '@/app/(public)/browse/[publicSlug]/buy-button';
import { CryptoBuyButton } from '@/app/(public)/browse/[publicSlug]/crypto-buy-button';
import { PromoCodeInput } from '@/components/promo-code/promo-code-input';
import { Separator } from '@/components/ui/separator';
import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';
import { isWeb3Enabled, SUPPORTED_WEB3_CHAIN_IDS } from '@/lib/web3/config';
import { hasSelectableCryptoChains } from '@/lib/web3/raffle-crypto-options';
import { PROMO_CODE_TYPE, type ValidatedPromoCode } from '@/types/promo-code';
import type { RaffleCryptoOptions } from '@/types/raffle';

import { SignInToBuyButton } from './sign-in-button';
import { TicketSelector } from './ticket-selector';

/**
 * Props for TicketPurchaseCard
 */
interface TicketPurchaseCardProps {
	raffleId: string;
	publicSlug: string;
	endAt: string;
	price: number;
	currency: string;
	availableTickets: number;
	disabled?: boolean;
	questionId?: string | null;
	isAuthenticated?: boolean;
	/** Structured crypto options from raffle — null when raffle doesn't accept crypto */
	cryptoOptions?: RaffleCryptoOptions | null;
	/** Current user ticket total for this raffle — baseline for crypto post-success sync */
	myTicketsTotal?: number;
	userId?: string | null;
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
	endAt,
	price,
	currency,
	availableTickets,
	disabled = false,
	questionId,
	isAuthenticated = true,
	cryptoOptions,
	myTicketsTotal = 0,
	userId,
}: TicketPurchaseCardProps) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	// isExpired not needed — isClosingSoon is only true when secondsRemaining > 0
	const { isClosingSoon, isHydrated } = useRaffleSaleWindow(endAt);
	// Only use code if non-empty (handles ?code= edge case)
	const codeParam = searchParams.get('code');
	const initialCode = codeParam?.trim() || undefined;

	const [ticketQuantity, setTicketQuantity] = useState(1);
	const [appliedPromo, setAppliedPromo] = useState<ValidatedPromoCode | null>(
		null,
	);
	const [promoResetSignal, setPromoResetSignal] = useState(0);

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
	 * Gets the ticket quantity for free tickets promo.
	 * Accepts optional promo override for pre-setState contexts where appliedPromo hasn't settled.
	 * @param promo - Optional promo to use instead of current appliedPromo state
	 * @returns Number of free tickets from promo
	 */
	function getFreeTicketCount(promo?: ValidatedPromoCode): number {
		const source = promo ?? appliedPromo;
		if (!source || source.type !== PROMO_CODE_TYPE.FREE_TICKETS) return 0;
		return Math.floor(parseFloat(source.value));
	}

	/**
	 * Handles valid promo code
	 * @param promo - The validated promo code
	 */
	function handleValidPromo(promo: ValidatedPromoCode) {
		// Step 1: Store validated promo.
		setAppliedPromo(promo);

		// Step 2: Sync ticket quantity for free tickets.
		if (promo.type === PROMO_CODE_TYPE.FREE_TICKETS) {
			setTicketQuantity(getFreeTicketCount(promo));
		}
	}

	/**
	 * Handles promo code removal
	 */
	function handleClearPromo() {
		// Step 1: Clear promo and reset quantity.
		setAppliedPromo(null);
		setTicketQuantity(1);
	}

	/**
	 * Handles promo invalidation from checkout flow.
	 * Keeps quantity for discount promos; resets for free-ticket promos.
	 */
	function handlePromoInvalid() {
		// Step 1: Clear promo and notify input to reset.
		const wasFreeTickets = appliedPromo?.type === PROMO_CODE_TYPE.FREE_TICKETS;
		setAppliedPromo(null);
		setPromoResetSignal(prev => prev + 1);

		if (wasFreeTickets) {
			// Step 2: Reset quantity for free-ticket promos.
			setTicketQuantity(1);
		}
	}

	/**
	 * Removes promo code from URL after redemption
	 */
	function clearPromoCodeFromUrl() {
		const params = new URLSearchParams(searchParams.toString());
		params.delete('code');

		const nextUrl = params.toString()
			? `${pathname}?${params.toString()}`
			: pathname;

		window.history.replaceState(null, '', nextUrl);
	}

	/**
	 * Handles successful promo redemption (free tickets).
	 * Reuses handlePromoInvalid because post-redemption cleanup
	 * (clear promo, bump reset signal, reset quantity) is identical
	 * to invalidation cleanup.
	 */
	function handlePromoRedeemed() {
		clearPromoCodeFromUrl();
		handlePromoInvalid();
	}

	const maxTickets = availableTickets;
	const subtotal = calculateSubtotal();
	const discount = calculateDiscount();
	const total = calculateTotal();
	const hasDiscount = discount > 0;
	const isFree = isFreeTicketsPromo();
	const freeTicketCount = isFree ? getFreeTicketCount() : 0;
	const shouldShowClosingSoonWarning = isHydrated && isClosingSoon;
	// Gate both warning copy and the CTA on the same resolved chain set the modal uses.
	// Otherwise unsupported backend chains can still surface a crypto button that opens
	// into an empty selector.
	const hasSelectableCryptoPaymentOption =
		hasSelectableCryptoChains(cryptoOptions, SUPPORTED_WEB3_CHAIN_IDS) &&
		isWeb3Enabled &&
		!isFree;

	/**
	 * Final-10-minute warning copy.
	 * We keep it next to the CTAs so the user sees the risk at decision time,
	 * not only in the countdown at the top of the card.
	 */
	function getClosingSoonWarning(): string {
		const baseMessage =
			'Raffle closes soon. Purchases stay open until the countdown ends. Start checkout now to avoid missing the cutoff.';

		if (!hasSelectableCryptoPaymentOption) return baseMessage;

		return `${baseMessage} Crypto payments can take longer to confirm near the end.`;
	}

	return (
		<div className="mt-0 space-y-4">
			{/* Price per ticket - hide for free tickets */}
			{!isFree && (
				<div className="flex items-center justify-between">
					<p className="text-sm text-[#929292]">Per ticket</p>
					<p className="font-clash-display text-2xl font-semibold lg:text-3xl">
						{formatPrice(price, currency)}
					</p>
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
			{isAuthenticated ? (
				<PromoCodeInput
					key={`${initialCode ?? ''}:${promoResetSignal}`}
					raffleId={raffleId}
					onValidCode={handleValidPromo}
					onClear={handleClearPromo}
					disabled={disabled}
					initialCode={initialCode}
				/>
			) : (
				<p className="text-sm text-[#7B7B7B]">Sign in to apply promo codes</p>
			)}

			{/* Mobile: Selected Tickets row */}
			{!isFree && (
				<div className="flex items-center justify-between lg:hidden">
					<p className="text-sm text-[#929292]">Selected Tickets</p>
					<p className="font-clash-display text-3xl font-semibold">
						{ticketQuantity}
					</p>
				</div>
			)}

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
				<p className="text-sm text-[#929292]">Total</p>
				<p className="font-clash-display text-3xl font-semibold">
					{isFree ? 'FREE' : formatPrice(total, currency)}
				</p>
			</div>

			{/* Free tickets info */}
			{isFree && (
				<p className="text-center text-sm text-green-600">
					{freeTicketCount} free ticket
					{freeTicketCount !== 1 ? 's' : ''} with this code
				</p>
			)}

			{shouldShowClosingSoonWarning && (
				<div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-700">
					{getClosingSoonWarning()}
				</div>
			)}

			{/* Buy button or Sign In button */}
			{isAuthenticated ? (
				<>
					<BuyButton
						raffleId={raffleId}
						publicSlug={publicSlug}
						ticketQuantity={isFree ? freeTicketCount : ticketQuantity}
						disabled={disabled}
						questionId={questionId}
						promoCode={appliedPromo?.code}
						isFreeTickets={isFree}
						onPromoInvalid={handlePromoInvalid}
						onPromoRedeemed={handlePromoRedeemed}
					/>

					{/* Crypto buy button — only when raffle has crypto options AND Web3 is configured */}
					{cryptoOptions && hasSelectableCryptoPaymentOption && (
						<CryptoBuyButton
							raffleId={raffleId}
							endAt={endAt}
							ticketQuantity={ticketQuantity}
							disabled={disabled}
							questionId={questionId}
							promoCode={appliedPromo?.code}
							onPromoInvalid={handlePromoInvalid}
							cryptoOptions={cryptoOptions}
							myTicketsTotal={myTicketsTotal}
							userId={userId}
						/>
					)}
				</>
			) : (
				<SignInToBuyButton />
			)}
		</div>
	);
}
