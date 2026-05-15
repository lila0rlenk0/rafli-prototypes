'use client';

import { Contrast, Diamond } from 'lucide-react';
import { useState } from 'react';

import { BuyButton } from '@/components/payment/buy-button';
import { CreditsBuyButton } from '@/components/payment/credits-buy-button';
import { CryptoBuyButton } from '@/components/payment/crypto-buy-button';
import { TenderRow } from '@/components/payment/tender-row';
import type { ValidatedPromoCode } from '@/types/promo-code';
import type { RaffleCryptoOptions } from '@/types/raffle';

import { CreditsUpsellCard } from './credits-upsell-card';
import { CryptoChainTenderList } from './crypto-chain-tender-list';

interface TenderStackProps {
	readonly raffleId: string;
	readonly publicSlug: string;
	readonly endAt: string;
	readonly currency: string;
	readonly disabled: boolean;
	readonly questionId: string | null | undefined;
	readonly total: number;
	readonly ticketQuantity: number;
	readonly appliedPromo: ValidatedPromoCode | null;
	readonly clearPromo: () => void;
	readonly cryptoOptions: RaffleCryptoOptions | null | undefined;
	readonly isCreditsAvailable: boolean;
	readonly isCryptoAvailable: boolean;
	readonly availableCredits: string | null | undefined;
	readonly myTicketsTotal: number;
	readonly userId: string | null | undefined;
	readonly creditsUpsellHref: string;
	readonly onPurchaseSettled?: () => void;
}

/**
 * Vertical stack of tender rows + auxiliary surfaces (chain preview,
 * credits upsell) rendered inside `PaymentMethodModal`.
 *
 * Promotion model — Credits is the only "selected" (filled brand-dark)
 * tender; when the user has no balance, no row is filled and the yellow
 * upsell becomes the visual next-best-action instead.
 *
 * Order:
 * - Credits-available: Credits (selected), Card, Crypto, [chain list when
 *   crypto is expanded].
 * - No credits: Card moves above the unavailable Credits stub so the
 *   universal-tender row leads. Crypto stays last, then the upsell card.
 *
 * Crypto chain breakdown is gated behind a click — the row's onClick both
 * expands the inline chain list AND fires the existing wallet/checkout
 * flow. The expanded state survives modal dismissals so the user can see
 * which networks the raffle accepts after backing out of wallet connect.
 *
 * @returns Column of tender rows + supporting surfaces
 */
export function TenderStack({
	raffleId,
	publicSlug,
	endAt,
	currency,
	disabled,
	questionId,
	total,
	ticketQuantity,
	appliedPromo,
	clearPromo,
	cryptoOptions,
	isCreditsAvailable,
	isCryptoAvailable,
	availableCredits,
	myTicketsTotal,
	userId,
	creditsUpsellHref,
	onPurchaseSettled,
}: TenderStackProps) {
	// Tracks whether the user has tapped Crypto to reveal the inline chain
	// list. Defaults to collapsed so the picker leads with the three tender
	// pills; the breakdown only renders after explicit intent. State stays
	// after the wallet/checkout modal opens so dismissing the modal returns
	// the user to the expanded picker rather than collapsing context.
	const [isCryptoExpanded, setIsCryptoExpanded] = useState(false);

	function expandCrypto() {
		setIsCryptoExpanded(true);
	}

	const creditsRow =
		isCreditsAvailable && availableCredits ? (
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
				variant="selected"
				onSuccess={onPurchaseSettled}
			/>
		) : (
			<TenderRow
				variant="unavailable"
				icon={<Contrast className="size-4" aria-hidden />}
				label="Credits"
				badge="Balance $0"
				description="No credits available"
				title="You don't have any credits yet"
				disabled
			/>
		);

	const cardRow = (
		<BuyButton
			raffleId={raffleId}
			publicSlug={publicSlug}
			disabled={disabled}
			questionId={questionId}
			total={total}
			variant="unselected"
		/>
	);

	const cryptoVariant = isCryptoExpanded ? 'active' : 'unselected';
	const cryptoRow =
		isCryptoAvailable && cryptoOptions ? (
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
				variant={cryptoVariant}
				onSelect={expandCrypto}
			/>
		) : (
			<TenderRow
				variant="unavailable"
				icon={<Diamond className="size-4" aria-hidden />}
				label="Crypto"
				badge="Unavailable"
				description="Not accepted for this sweepstakes"
				title="Crypto isn't accepted for this sweepstakes"
				disabled
			/>
		);

	const showChainList =
		isCryptoExpanded &&
		isCryptoAvailable &&
		!!cryptoOptions &&
		cryptoOptions.chains.length > 0;

	// Credits-available figma leads with Credits; the no-credits figma swaps
	// Card above the unavailable Credits stub so the universal tender holds
	// the top slot. Crypto always sits last.
	//
	// `max-w-(--container-tender-stack)` (412px) pins the column to the
	// figma's methods-frame width so each pill row spans the right share of
	// the 590px inner content column — the previous `max-w-80` (320px) on
	// individual rows left the picker looking under-weight inside the 830px
	// modal.
	return (
		<div className="mx-auto flex w-full max-w-(--container-tender-stack) flex-col items-stretch gap-2.5">
			{isCreditsAvailable ? (
				<>
					{creditsRow}
					{cardRow}
				</>
			) : (
				<>
					{cardRow}
					{creditsRow}
				</>
			)}
			{cryptoRow}

			{showChainList ? (
				<CryptoChainTenderList cryptoOptions={cryptoOptions} />
			) : null}

			{!isCreditsAvailable ? (
				<CreditsUpsellCard href={creditsUpsellHref} />
			) : null}
		</div>
	);
}
