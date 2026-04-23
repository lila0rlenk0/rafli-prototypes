'use client';

import { Separator } from '@/components/ui/separator';
import type { RaffleCryptoOptions } from '@/types/raffle';

import { BuyCtaStack } from './buy-cta-stack';
import { getClosingSoonWarning } from './ticket-purchase-present';
import { PriceBreakdown } from './price-breakdown';
import { PromoApplyBlock } from './promo-apply-block';
import { QuantityControls } from './quantity-controls';
import { useTicketPurchase } from './use-purchase';

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
	/** User's available credit balance as decimal string — null when unauthenticated or fetch failed */
	availableCredits?: string | null;
	/**
	 * Raffle title — forwarded to `AccessPassDisclaimer` so the per-raffle
	 * Access Pass framing names the specific raffle instead of reading as
	 * generic boilerplate. Required for the reframe layer of the
	 * compliance defense to be non-pretextual.
	 */
	raffleTitle?: string;
}

/**
 * Orchestrates the ticket purchase flow: quantity selection, promo codes,
 * price breakdown, and buy CTAs. The heavy lifting (store reads, derived
 * math, handlers) lives in `useTicketPurchase`; this component only
 * composes the four presentational surfaces.
 *
 * @param props - Raffle identifiers, pricing, auth state, compliance copy
 * @returns Full purchase card (quantity + promo + price + CTA stack)
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
	availableCredits,
	raffleTitle,
}: TicketPurchaseCardProps) {
	const {
		initialCode,
		ticketQuantity,
		appliedPromo,
		promoResetVersion,
		applyPromo,
		clearPromo,
		handleClearPromo,
		orderTotal,
		isFree,
		hasDiscount,
		shouldShowClosingSoonWarning,
		hasSelectableCryptoPaymentOption,
		showCreditsOption,
	} = useTicketPurchase({
		endAt,
		price,
		cryptoOptions,
		availableCredits,
	});

	return (
		<div className="mt-0 flex flex-col gap-2 gap-4 lg:flex">
			{/* Quantity surface — price header, stepper, mobile summary.
			    Hidden for free-tickets promos where the price is $0. */}
			{!isFree ? (
				<QuantityControls
					price={price}
					currency={currency}
					maxTickets={availableTickets}
					ticketQuantity={ticketQuantity}
				/>
			) : null}

			<PromoApplyBlock
				raffleId={raffleId}
				isAuthenticated={isAuthenticated}
				initialCode={initialCode}
				promoResetVersion={promoResetVersion}
				disabled={disabled}
				onValidCode={applyPromo}
				onClear={handleClearPromo}
			/>

			<Separator className="bg-ink-300 my-4" />

			<PriceBreakdown
				currency={currency}
				subtotal={orderTotal.subtotal}
				discount={orderTotal.discount}
				total={orderTotal.total}
				hasDiscount={hasDiscount}
				isFree={isFree}
				freeTicketCount={orderTotal.freeTicketCount}
			/>

			{shouldShowClosingSoonWarning ? (
				<div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-700">
					{getClosingSoonWarning({ hasSelectableCryptoPaymentOption })}
				</div>
			) : null}

			<BuyCtaStack
				raffleId={raffleId}
				publicSlug={publicSlug}
				endAt={endAt}
				currency={currency}
				disabled={disabled}
				questionId={questionId}
				isAuthenticated={isAuthenticated}
				isFree={isFree}
				total={orderTotal.total}
				ticketQuantity={ticketQuantity}
				appliedPromo={appliedPromo}
				clearPromo={clearPromo}
				raffleTitle={raffleTitle}
				cryptoOptions={cryptoOptions}
				hasSelectableCryptoPaymentOption={hasSelectableCryptoPaymentOption}
				showCreditsOption={showCreditsOption}
				availableCredits={availableCredits}
				myTicketsTotal={myTicketsTotal}
				userId={userId}
			/>
		</div>
	);
}
