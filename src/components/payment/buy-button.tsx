'use client';

import { CreditCardIcon, Loader2Icon } from 'lucide-react';

import { RaffleQuestionModal } from '@/components/raffle/question-modal/question-modal';
import { Button } from '@/components/ui/button';
import { useStripeCheckout } from '@/lib/checkout/use-stripe-checkout';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import { PROMO_CODE_TYPE } from '@/types/promo-code';

/**
 * Props for BuyButton.
 *
 * Why so few props now: ticket quantity, applied promo, and the promo
 * invalidation callback all live in the shared `TicketQuantityStore`.
 * The component reads them via the `useStripeCheckout` hook so it doesn't
 * need to receive them via prop drilling from `TicketPurchaseCard`.
 */
interface BuyButtonProps {
	raffleId: string;
	publicSlug: string;
	disabled?: boolean;
	questionId?: string | null;
}

/**
 * Desktop in-card primary CTA for the Stripe checkout flow. On mobile this
 * button is hidden by `TicketPurchaseCard` (`hidden lg:block` wrapper); the
 * `StickyBuyTicketsCta` at the bottom of the viewport renders the mobile
 * equivalent and drives the same `useStripeCheckout` hook so both paths
 * share order construction, quiz gating, and promo handling.
 */
export function BuyButton({
	raffleId,
	publicSlug,
	disabled = false,
	questionId,
}: BuyButtonProps) {
	// Free-tickets state drives the button label — read straight from the store
	// so the label flips the moment a free-tickets promo is applied/cleared,
	// without an extra prop hop from `TicketPurchaseCard`.
	const appliedPromo = useTicketQuantityStore(state => state.appliedPromo);
	const isFreeTickets = appliedPromo?.type === PROMO_CODE_TYPE.FREE_TICKETS;

	// Access Pass acknowledgment gates the paid path only — free-tickets
	// promos have no consideration so the legal acknowledgment doesn't apply.
	// Reading from the same store the mobile sticky CTA uses guarantees both
	// surfaces gate on the same consent flip in the same frame.
	const isAcknowledged = useTicketQuantityStore(
		state => state.isAccessPassAcknowledged,
	);
	const isGatedByAcknowledgment = !isFreeTickets && !isAcknowledged;

	const {
		isLoading,
		showQuestionModal,
		setShowQuestionModal,
		initiate,
		handleCorrectAnswer,
	} = useStripeCheckout({
		raffleId,
		publicSlug,
		questionId,
		disabled,
	});

	function getButtonText(): string {
		if (isLoading) return 'Processing...';
		if (isFreeTickets) {
			return 'AMOE - Free Entries';
		}
		return 'One Time Purchase with Card';
	}

	return (
		<>
			{/* No id="checkout-action" — the mobile sticky CTA owns that id now
			    that the click-through pattern is gone. Desktop uses this button
			    directly via its own click handler; e2e tests for the desktop flow
			    locate it by role/label, not id. */}
			<Button
				onClick={initiate}
				disabled={isLoading || disabled || isGatedByAcknowledgment}
				title={
					isGatedByAcknowledgment
						? 'Please acknowledge the terms above to continue'
						: undefined
				}
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				{isLoading ? (
					<Loader2Icon className="mr-2 size-4 animate-spin" />
				) : (
					<CreditCardIcon className="mr-2 size-4" aria-hidden="true" />
				)}
				<p className="font-semibold">{getButtonText()}</p>
			</Button>

			{questionId ? (
				<RaffleQuestionModal
					open={showQuestionModal}
					onOpenChange={setShowQuestionModal}
					raffleId={raffleId}
					onCorrectAnswer={handleCorrectAnswer}
				/>
			) : null}
		</>
	);
}
