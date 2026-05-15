'use client';

import { Loader2Icon } from 'lucide-react';

import { AccessPassAcknowledgment } from '@/components/compliance/access-pass-acknowledgment';
import { AccessPassDisclaimer } from '@/components/compliance/access-pass-disclaimer';
import { NoPurchaseNecessaryFootnote } from '@/components/compliance/no-purchase-necessary-footnote';
import { Button } from '@/components/ui/button';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import { PROMO_CODE_TYPE, type ValidatedPromoCode } from '@/types/promo-code';

import { SignInToBuyButton } from '../sign-in-button';
import { useClaimFreeTickets } from './use-claim-free-tickets';

interface BuyCtaStackProps {
	readonly raffleId: string;
	readonly isAuthenticated: boolean;
	readonly isFree: boolean;
	readonly disabled: boolean;
	readonly ticketQuantity: number;
	readonly appliedPromo: ValidatedPromoCode | null;
	readonly clearPromo: () => void;
	readonly raffleTitle: string | undefined;
}

/**
 * Auth-gated CTA cluster — compliance copy (disclaimer + acknowledgment +
 * no-purchase-necessary footnote) plus a single "One Time Purchase"
 * trigger on `lg+` that opens the picker modal. Anonymous users see the
 * desktop-only sign-in CTA since the mobile sticky bar already renders
 * its own sign-in path.
 *
 * Free-tickets promos bypass the picker — the trigger directly invokes
 * `useClaimFreeTickets` (which posts the $0 order and opens the
 * confirmation modal in the same store update). For paid orders, the
 * trigger flips `isPaymentMethodModalOpen` so the user can choose a
 * tender.
 *
 * Acknowledgment is now in the scrollable page on every breakpoint (the
 * mobile-only PaymentMethodModal footer was retired). The gate moved
 * upstream from the tender buttons to this trigger: clicking without a
 * tick calls `requestAcknowledgment` which scrolls to the checkbox and
 * surfaces the inline form-style error, instead of silently disabling
 * the buttons inside the picker.
 *
 * Mobile: this component renders the compliance copy + acknowledgment in
 * the scrolling card; the sticky CTA at the bottom of the viewport carries
 * the primary trigger, bundle quick-picks, and the no-purchase footnote.
 *
 * Desktop-only no-purchase footnote: the mobile sticky already shows the
 * footnote, so rendering it inline would double-print the same legal
 * notice on small screens.
 *
 * @param props - Compliance + acknowledgment-gating inputs
 * @returns Compliance copy + desktop CTA (authed) or sign-in CTA (anonymous)
 */
export function BuyCtaStack(props: BuyCtaStackProps) {
	const {
		raffleId,
		isAuthenticated,
		isFree,
		disabled,
		ticketQuantity,
		appliedPromo,
		clearPromo,
		raffleTitle,
	} = props;

	const isAcknowledged = useTicketQuantityStore(
		state => state.isAccessPassAcknowledged,
	);
	const openPicker = useTicketQuantityStore(
		state => state.setPaymentMethodModalOpen,
	);
	const requestAcknowledgment = useTicketQuantityStore(
		state => state.requestAcknowledgment,
	);

	const isFreeTicketsPromo =
		appliedPromo?.type === PROMO_CODE_TYPE.FREE_TICKETS;

	// Free-tickets claim path — instantiated regardless of `isFreeTicketsPromo`
	// so React hook order stays stable across the promo apply/clear flip. The
	// hook is cheap when idle (no network until `claim()` is called).
	const { claim: claimFreeTickets, isClaiming } = useClaimFreeTickets({
		raffleId,
		ticketQuantity,
		promoCode: appliedPromo?.code,
		onPromoInvalid: clearPromo,
	});

	const shouldShowPaidCompliance = !isFree && isAuthenticated;

	function handleTriggerClick() {
		// Free-tickets short-circuit: skip the picker entirely. Posting the
		// order here matches the picker's credits success path — both routes
		// converge on `handlePurchaseSettled` inside the claim hook.
		if (isFreeTicketsPromo) {
			void claimFreeTickets();
			return;
		}
		// Gate on the legal acknowledgment — only paid orders carry
		// consideration, free tickets bypass above. The checkbox is right
		// above this button on desktop but we still call requestAcknowledgment
		// for a single consistent UX: surfaces the inline error so the user
		// knows what's blocking, and bumps the scroll nonce (cheap no-op when
		// already in view).
		if (!isAcknowledged) {
			requestAcknowledgment();
			return;
		}
		openPicker(true);
	}

	if (!isAuthenticated) {
		return (
			<div className="hidden lg:block">
				<SignInToBuyButton />
			</div>
		);
	}

	return (
		<>
			{/* Mobile sticky owns the footnote on small screens; hiding the
			    inline copy below `lg` prevents double-printing the legal notice. */}
			{!isFree ? (
				<div className="hidden lg:block">
					<NoPurchaseNecessaryFootnote />
				</div>
			) : null}

			{shouldShowPaidCompliance ? (
				<>
					<AccessPassDisclaimer
						raffleTitle={raffleTitle}
						ticketQuantity={ticketQuantity}
					/>
					{/* Page-inline acknowledgment renders on every breakpoint —
					    the mobile sticky CTA below `lg` calls back into this
					    component's store-backed gate when tapped pre-tick. */}
					<AccessPassAcknowledgment />
				</>
			) : null}

			{/* Desktop-only trigger: the mobile sticky CTA carries the primary
			    "One time purchase $X" on `< lg`, so an inline duplicate here
			    would stack two primary CTAs on small screens. */}
			<div className="hidden lg:block">
				<Button
					onClick={handleTriggerClick}
					disabled={disabled || isClaiming}
					className="h-12 w-full cursor-pointer"
				>
					{isClaiming ? (
						<Loader2Icon className="mr-2 size-4 animate-spin" />
					) : null}
					<p className="font-semibold">
						{isFreeTicketsPromo ? 'AMOE - Free Entries' : 'One Time Purchase'}
					</p>
				</Button>
			</div>
		</>
	);
}
