'use client';

import { Separator } from '@/components/ui/separator';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import type { RaffleCryptoOptions } from '@/types/raffle';
import type { RaffleSubscriptionContext } from '@/types/subscription';

import { BuyCtaStack } from './buy-cta-stack';
import { EntriesConfirmedModal } from './entries-confirmed-modal';
import { getClosingSoonWarning } from './ticket-purchase-present';
import { PaymentMethodModal } from './payment-method-modal';
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
	/** Current user ticket total for this raffle — baseline for crypto post-success sync + the celebration modal's "Your Entries" projection */
	myTicketsTotal?: number;
	/** Raffle pool baseline before this purchase — feeds the celebration modal's "Total in Pool" + odds projection */
	ticketsSoldCount?: number;
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
	/**
	 * Active subscription snapshot — drives subscriber-effective unit price math
	 * and the savings caption in `PriceBreakdown`. Inactive sentinel keeps the
	 * non-subscriber rendering path identical to pre-feature behavior.
	 */
	subscription: RaffleSubscriptionContext;
}

/**
 * Orchestrates the ticket purchase flow: quantity selection, promo codes,
 * price breakdown, compliance gating, and modal hosting. The heavy lifting
 * (store reads, derived math, handlers) lives in `useTicketPurchase`; this
 * component composes the four presentational surfaces and owns the single
 * picker / entries-confirmed modal instances.
 *
 * Single modal host: both the desktop in-card trigger and the mobile sticky
 * CTA flip `isPaymentMethodModalOpen` in the shared store, so we render
 * one `PaymentMethodModal` here that both surfaces drive. This keeps tender
 * state, quiz gating, and the post-purchase handoff in one place instead of
 * duplicated per surface.
 *
 * @param props - Raffle identifiers, pricing, auth state, compliance copy
 * @returns Full purchase card (quantity + promo + price + CTA stack + modals)
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
	ticketsSoldCount = 0,
	userId,
	availableCredits,
	raffleTitle,
	subscription,
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
		subscription,
	});

	// Shared modal state — the desktop in-card "One Time Purchase" button
	// and the mobile sticky CTA both flip these flags via the store, so a
	// single modal instance services both surfaces.
	const isPaymentMethodModalOpen = useTicketQuantityStore(
		state => state.isPaymentMethodModalOpen,
	);
	const setPaymentMethodModalOpen = useTicketQuantityStore(
		state => state.setPaymentMethodModalOpen,
	);
	const isEntriesConfirmedModalOpen = useTicketQuantityStore(
		state => state.isEntriesConfirmedModalOpen,
	);
	const setEntriesConfirmedModalOpen = useTicketQuantityStore(
		state => state.setEntriesConfirmedModalOpen,
	);
	const handlePurchaseSettled = useTicketQuantityStore(
		state => state.handlePurchaseSettled,
	);

	return (
		<div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 flex flex-col gap-4 motion-safe:duration-500 motion-safe:ease-(--ease-back-out)">
			{/* Quantity surface — price header, stepper, mobile summary.
			    Hidden for free-tickets promos where the price is $0.
			    `effectiveUnitPrice` reflects the subscriber-discounted unit so the
			    "Per entry" label matches what BE charges; the `Subscription` prop
			    drives the strikethrough on the un-discounted price for transparency. */}
			{!isFree ? (
				<QuantityControls
					price={price}
					effectiveUnitPrice={orderTotal.effectiveUnitPrice}
					currency={currency}
					maxTickets={availableTickets}
					ticketQuantity={ticketQuantity}
					subscription={subscription}
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

			<Separator className="my-4" />

			<PriceBreakdown
				currency={currency}
				subtotal={orderTotal.subtotal}
				discount={orderTotal.discount}
				total={orderTotal.total}
				hasDiscount={hasDiscount}
				isFree={isFree}
				freeTicketCount={orderTotal.freeTicketCount}
				subscriberDiscountAmount={orderTotal.subscriberDiscountAmount}
				subscriptionPlanName={subscription.planName}
			/>

			{shouldShowClosingSoonWarning ? (
				<div className="bg-peach-100 text-amber rounded-xl px-4 py-3 text-center text-xs">
					{getClosingSoonWarning({ hasSelectableCryptoPaymentOption })}
				</div>
			) : null}

			<BuyCtaStack
				raffleId={raffleId}
				isAuthenticated={isAuthenticated}
				isFree={isFree}
				disabled={disabled}
				ticketQuantity={ticketQuantity}
				appliedPromo={appliedPromo}
				clearPromo={clearPromo}
				raffleTitle={raffleTitle}
			/>

			{/* Single modal host for both desktop card + mobile sticky triggers.
			    The picker mounts unconditionally (gated by the open flag) so
			    `setPaymentMethodModalOpen(true)` from either surface always finds
			    a target. */}
			<PaymentMethodModal
				open={isPaymentMethodModalOpen}
				onOpenChange={setPaymentMethodModalOpen}
				raffleId={raffleId}
				publicSlug={publicSlug}
				endAt={endAt}
				currency={currency}
				disabled={disabled}
				questionId={questionId}
				total={orderTotal.total}
				ticketQuantity={ticketQuantity}
				appliedPromo={appliedPromo}
				clearPromo={clearPromo}
				cryptoOptions={cryptoOptions}
				hasSelectableCryptoPaymentOption={hasSelectableCryptoPaymentOption}
				showCreditsOption={showCreditsOption}
				availableCredits={availableCredits}
				myTicketsTotal={myTicketsTotal}
				userId={userId}
				raffleTitle={raffleTitle}
				onPurchaseSettled={handlePurchaseSettled}
			/>

			{/* `yourEntries` / `totalInPool` projected here from the page's
			    pre-purchase baselines: handlePurchaseSettled opens this modal
			    BEFORE router.refresh fires (use-claim-free-tickets), so the
			    parent's myTicketsTotal/ticketsSoldCount are still pre-purchase
			    at this exact render. Adding ticketQuantity yields the
			    post-purchase totals; the body snapshots them at mount so the
			    later RSC refresh can't shift the figures mid-celebration. */}
			<EntriesConfirmedModal
				open={isEntriesConfirmedModalOpen}
				onOpenChange={setEntriesConfirmedModalOpen}
				publicSlug={publicSlug}
				raffleTitle={raffleTitle}
				ticketQuantity={ticketQuantity}
				yourEntries={myTicketsTotal + ticketQuantity}
				totalInPool={ticketsSoldCount + ticketQuantity}
			/>
		</div>
	);
}
