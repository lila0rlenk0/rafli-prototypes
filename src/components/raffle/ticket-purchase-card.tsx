'use client';

import { useSearchParams } from 'next/navigation';

import { AccessPassAcknowledgment } from '@/components/compliance/access-pass-acknowledgment';
import { AccessPassDisclaimer } from '@/components/compliance/access-pass-disclaimer';
import { NoPurchaseNecessaryFootnote } from '@/components/compliance/no-purchase-necessary-footnote';
import { BuyButton } from '@/components/payment/buy-button';
import { CreditsBuyButton } from '@/components/payment/credits-buy-button';
import { CryptoBuyButton } from '@/components/payment/crypto-buy-button';
import { PromoCodeInput } from '@/components/promo-code/promo-code-input';
import { Separator } from '@/components/ui/separator';
import {
	calculateOrderTotal,
	formatPrice,
} from '@/lib/checkout/calculate-order-total';
import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';
import { isWeb3Enabled, SUPPORTED_WEB3_CHAIN_IDS } from '@/lib/web3/constants';
import { hasSelectableCryptoChains } from '@/lib/web3/raffle-crypto-options';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import type { RaffleCryptoOptions } from '@/types/raffle';

import { SignInToBuyButton } from './sign-in-button';
import { TicketSelector } from './ticket-selector';

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
 * Orchestrates the ticket purchase flow: quantity selection, promo codes, and buy CTAs.
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
	const searchParams = useSearchParams();
	// isExpired not needed — isClosingSoon is only true when secondsRemaining > 0
	const { isClosingSoon, isHydrated } = useRaffleSaleWindow(endAt);
	// Only use code if non-empty (handles ?code= edge case)
	const codeParam = searchParams.get('code');
	const initialCode = codeParam?.trim() || undefined;

	// All checkout state lives in the page-scoped TicketQuantityStore so the
	// mobile StickyBuyTicketsCta and the inline card share a single source of
	// truth for quantity *and* applied promo. Promo handlers reduce to thin
	// wrappers around store actions.
	const ticketQuantity = useTicketQuantityStore(state => state.quantity);
	const resetTicketQuantity = useTicketQuantityStore(state => state.reset);
	const appliedPromo = useTicketQuantityStore(state => state.appliedPromo);
	const promoResetVersion = useTicketQuantityStore(
		state => state.promoResetVersion,
	);
	const applyPromo = useTicketQuantityStore(state => state.applyPromo);
	const clearPromo = useTicketQuantityStore(state => state.clearPromo);

	function handleClearPromo() {
		// Explicit user clear (PromoCodeInput's clear button) drops the promo
		// AND always resets quantity to 1 — preserves prior behavior where the
		// user starting over from the input also reset the manual selection.
		clearPromo();
		resetTicketQuantity();
	}

	const maxTickets = availableTickets;
	const { subtotal, discount, total, isFreeTicketsPromo, freeTicketCount } =
		calculateOrderTotal({ price, quantity: ticketQuantity, appliedPromo });
	const hasDiscount = discount > 0;
	const isFree = isFreeTicketsPromo;
	const shouldShowClosingSoonWarning = isHydrated && isClosingSoon;
	// Gate both warning copy and the CTA on the same resolved chain set the modal uses.
	// Otherwise unsupported backend chains can still surface a crypto button that opens
	// into an empty selector.
	const hasSelectableCryptoPaymentOption =
		hasSelectableCryptoChains(cryptoOptions, SUPPORTED_WEB3_CHAIN_IDS) &&
		isWeb3Enabled &&
		!isFree;

	// Credits button shown when user has any credits, order costs money, and not a free-tickets promo.
	// The button itself handles insufficient-balance state (disabled + tooltip).
	const creditBalance = availableCredits ? parseFloat(availableCredits) : 0;
	const showCreditsOption = creditBalance > 0 && !isFree && total > 0;

	// Near-CTA placement so user sees the risk at decision time, not only in the countdown.
	function getClosingSoonWarning(): string {
		const baseMessage =
			'Raffle closes soon. Purchases stay open until the countdown ends. Start checkout now to avoid missing the cutoff.';

		if (!hasSelectableCryptoPaymentOption) return baseMessage;

		return `${baseMessage} Crypto payments can take longer to confirm near the end.`;
	}

	return (
		<div className="mt-0 space-y-4 lg:space-y-2">
			{/* Price per entry — reframed from "per ticket" so the pricing line
			    reads as platform access that includes an entry, not a ticket
			    sale. Hidden for free-tickets promos where the price is $0. */}
			{!isFree ? (
				<div className="flex items-center justify-between">
					<p className="text-sm text-[#929292]">Per entry</p>
					<p className="font-clash-display text-2xl font-semibold lg:text-3xl">
						{formatPrice(price, currency)}
					</p>
				</div>
			) : null}

			{/* Entry selector — hide for free-tickets promos. Quantity comes
			    from the shared store so no callback wiring needed. */}
			{!isFree ? <TicketSelector maxTickets={maxTickets} /> : null}

			{/* Promo code input */}
			{isAuthenticated ? (
				<PromoCodeInput
					key={`${initialCode ?? ''}:${promoResetVersion}`}
					raffleId={raffleId}
					onValidCode={applyPromo}
					onClear={handleClearPromo}
					disabled={disabled}
					initialCode={initialCode}
				/>
			) : (
				<p className="text-sm text-[#7B7B7B]">Sign in to apply promo codes</p>
			)}

			{/* Mobile — entry count summary. Mirrors the desktop quantity
			    indicator since the counter input isn't visible at this scroll
			    position on mobile. */}
			{!isFree ? (
				<div className="flex items-center justify-between lg:hidden">
					<p className="text-sm text-[#929292]">Entries</p>
					<p className="font-clash-display text-3xl font-semibold">
						{ticketQuantity}
					</p>
				</div>
			) : null}

			<Separator className="my-4 bg-[#B4B4B4]" />

			{/* Price breakdown — only show subtotal/discount when there's a non-free discount */}
			{hasDiscount && !isFree ? (
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
			) : null}

			{/* Total price */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-[#929292]">Total</p>
				<p className="font-clash-display text-3xl font-semibold">
					{isFree ? 'FREE' : formatPrice(total, currency)}
				</p>
			</div>

			{/* Bonus entries info — reframed from "free tickets" so promo
			    grants read as bonus entries, consistent with the AMOE
			    terminology elsewhere on the page. */}
			{isFree ? (
				<p className="text-center text-sm text-green-600">
					{freeTicketCount} bonus entr
					{freeTicketCount !== 1 ? 'ies' : 'y'} with this code
				</p>
			) : null}

			{shouldShowClosingSoonWarning ? (
				<div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-700">
					{getClosingSoonWarning()}
				</div>
			) : null}

			{/* No-purchase-necessary footnote directly under the price — keeps
			    the free-entry reference adjacent to every monetary figure, which
			    is what the "equal prominence" pierce test looks at. Rendered for
			    paid flows only; free-tickets promos already carry their own
			    "FREE" label and don't need the footnote. */}
			{!isFree ? <NoPurchaseNecessaryFootnote /> : null}

			{/* Disclaimer + required acknowledgment — rendered only on the
			    paid path. Free-ticket promos already satisfy AMOE by design
			    (no consideration), so the acknowledgment gate would only add
			    friction without legal benefit there. Authenticated guard
			    mirrors the CTA visibility below — unauth users see the
			    sign-in button instead of the buy flow. */}
			{!isFree && isAuthenticated ? (
				<>
					<AccessPassDisclaimer raffleTitle={raffleTitle} />
					<AccessPassAcknowledgment />
				</>
			) : null}

			{/* Buy button or Sign In button */}
			{isAuthenticated ? (
				<>
					{/* Stripe primary CTA — desktop only. On mobile the sticky
					    `StickyBuyTicketsCta` at the bottom of the viewport renders
					    the equivalent "Enter now" button via the same
					    `useStripeCheckout` hook, so duplicating the in-card button
					    on mobile would create two visible primary CTAs. Wrapping
					    in `hidden lg:block` keeps the desktop layout unchanged
					    while removing the mobile duplicate. The wrapper also
					    keeps the React subtree mounted on mobile so the hook's
					    state lifecycle is consistent across breakpoints — the
					    DOM element is just `display:none`. */}
					<div className="hidden lg:block">
						<BuyButton
							raffleId={raffleId}
							publicSlug={publicSlug}
							disabled={disabled}
							questionId={questionId}
						/>
					</div>

					{/* Credits buy button — secondary payment, stays in the card
					    on both breakpoints. Sticky CTA only owns the *primary*
					    Stripe path; alternative payments stay near the price
					    breakdown so users see the choice at decision time. */}
					{showCreditsOption ? (
						availableCredits ? (
							<CreditsBuyButton
								raffleId={raffleId}
								ticketQuantity={ticketQuantity}
								disabled={disabled}
								questionId={questionId}
								promoCode={appliedPromo?.code}
								onPromoInvalid={clearPromo}
								availableCredits={availableCredits}
								orderTotal={total}
								currency={currency}
							/>
						) : null
					) : null}

					{/* Crypto buy button — secondary payment, same rationale as
					    credits above. Only when raffle has crypto options AND
					    Web3 is configured. */}
					{cryptoOptions ? (
						hasSelectableCryptoPaymentOption ? (
							<CryptoBuyButton
								raffleId={raffleId}
								endAt={endAt}
								ticketQuantity={ticketQuantity}
								disabled={disabled}
								questionId={questionId}
								promoCode={appliedPromo?.code}
								onPromoInvalid={clearPromo}
								cryptoOptions={cryptoOptions}
								myTicketsTotal={myTicketsTotal}
								userId={userId}
							/>
						) : null
					) : null}
				</>
			) : (
				// Desktop-only sign-in CTA. On mobile, the StickyBuyTicketsCta
				// at the bottom of the viewport already renders a sign-in button,
				// so duplicating it inside the inline card stacks two identical
				// buttons on top of each other.
				<div className="hidden lg:block">
					<SignInToBuyButton />
				</div>
			)}
		</div>
	);
}
