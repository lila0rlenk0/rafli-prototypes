'use client';

import { RectangleHorizontal } from 'lucide-react';

import {
	TenderRow,
	type TenderRowVariant,
} from '@/components/payment/tender-row';
import { RaffleQuestionModal } from '@/components/raffle/question-modal/question-modal';
import { useStripeCheckout } from '@/lib/checkout/use-stripe-checkout';

/**
 * Props for BuyButton.
 *
 * `variant` lets the picker promote Card to the recommended-action slot
 * (filled brand-dark) when Credits aren't selectable for this user, so
 * the picker always has exactly one filled tender no matter the state.
 */
interface BuyButtonProps {
	raffleId: string;
	publicSlug: string;
	disabled?: boolean;
	questionId?: string | null;
	/** Order total in major currency units — drives the `expectedTotal` guard
	 *  inside `useStripeCheckout`. */
	total: number;
	/** Picker slot variant — controls fill/outline + icon-chip contrast */
	variant?: TenderRowVariant;
}

/**
 * Card-tender row rendered inside `PaymentMethodModal`. The picker only
 * opens for paid orders — free-tickets promos short-circuit upstream into
 * `useClaimFreeTickets` — so this row is always the paid Stripe tender.
 */
export function BuyButton({
	raffleId,
	publicSlug,
	disabled = false,
	questionId,
	total,
	variant = 'unselected',
}: BuyButtonProps) {
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
		expectedTotal: total,
	});

	return (
		<>
			{/* Access Pass acknowledgment is gated upstream on the "One Time
			    Purchase" trigger — by the time this row renders inside the open
			    picker, the user has already passed the consent check. */}
			<TenderRow
				variant={variant}
				icon={<RectangleHorizontal className="size-4" aria-hidden />}
				label="Card"
				badge="Instant"
				isLoading={isLoading}
				disabled={disabled}
				onClick={initiate}
			/>

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
