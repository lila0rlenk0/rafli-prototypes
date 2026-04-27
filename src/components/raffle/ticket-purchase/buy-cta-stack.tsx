'use client';

import { AccessPassAcknowledgment } from '@/components/compliance/access-pass-acknowledgment';
import { AccessPassDisclaimer } from '@/components/compliance/access-pass-disclaimer';
import { NoPurchaseNecessaryFootnote } from '@/components/compliance/no-purchase-necessary-footnote';
import { BuyButton } from '@/components/payment/buy-button';
import { CreditsBuyButton } from '@/components/payment/credits-buy-button';
import { CryptoBuyButton } from '@/components/payment/crypto-buy-button';
import type { ValidatedPromoCode } from '@/types/promo-code';
import type { RaffleCryptoOptions } from '@/types/raffle';

import { SignInToBuyButton } from '../sign-in-button';

interface BuyCtaStackProps {
	readonly raffleId: string;
	readonly publicSlug: string;
	readonly endAt: string;
	readonly currency: string;
	readonly disabled: boolean;
	readonly questionId: string | null | undefined;
	readonly isAuthenticated: boolean;
	readonly isFree: boolean;
	readonly total: number;
	readonly ticketQuantity: number;
	readonly appliedPromo: ValidatedPromoCode | null;
	readonly clearPromo: () => void;
	readonly raffleTitle: string | undefined;
	readonly cryptoOptions: RaffleCryptoOptions | null | undefined;
	readonly hasSelectableCryptoPaymentOption: boolean;
	readonly showCreditsOption: boolean;
	readonly availableCredits: string | null | undefined;
	readonly myTicketsTotal: number;
	readonly userId: string | null | undefined;
}

/**
 * Auth-gated CTA cluster — compliance copy (disclaimer + acknowledgment +
 * no-purchase-necessary footnote) plus the Stripe / credits / crypto
 * buttons stacked vertically. Anonymous users see the desktop-only
 * sign-in CTA since the mobile sticky bar already renders its own
 * sign-in path.
 *
 * Desktop-only wrapper on `BuyButton` and `SignInToBuyButton`: the mobile
 * `StickyBuyTicketsCta` drives the same primary flow via shared hooks,
 * so an in-card duplicate would stack two primary CTAs on top of each
 * other. Keeping the wrapper mounted on mobile (`display:none`)
 * preserves the React subtree lifecycle across breakpoints.
 *
 * @param props - Full purchase context forwarded from the card
 * @returns Compliance copy + stacked buy CTAs (authed) or sign-in CTA (anonymous)
 */
export function BuyCtaStack(props: BuyCtaStackProps) {
	const {
		raffleId,
		publicSlug,
		endAt,
		currency,
		disabled,
		questionId,
		isAuthenticated,
		isFree,
		total,
		ticketQuantity,
		appliedPromo,
		clearPromo,
		raffleTitle,
		cryptoOptions,
		hasSelectableCryptoPaymentOption,
		showCreditsOption,
		availableCredits,
		myTicketsTotal,
		userId,
	} = props;

	// Paid-path footnote — sits directly under the price so the free-entry
	// reference stays adjacent to every monetary figure (the "equal
	// prominence" pierce test). Free-tickets flows already carry their own
	// FREE label and don't need it.
	const shouldShowPaidCompliance = !isFree && isAuthenticated;

	if (!isAuthenticated) {
		return (
			<div className="hidden lg:block">
				<SignInToBuyButton />
			</div>
		);
	}

	return (
		<>
			{!isFree ? <NoPurchaseNecessaryFootnote /> : null}

			{shouldShowPaidCompliance ? (
				<>
					<AccessPassDisclaimer
						raffleTitle={raffleTitle}
						ticketQuantity={ticketQuantity}
					/>
					<AccessPassAcknowledgment />
				</>
			) : null}

			<div className="hidden lg:block">
				<BuyButton
					raffleId={raffleId}
					publicSlug={publicSlug}
					disabled={disabled}
					questionId={questionId}
				/>
			</div>

			{showCreditsOption && availableCredits ? (
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
			) : null}

			{cryptoOptions && hasSelectableCryptoPaymentOption ? (
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
			) : null}
		</>
	);
}
