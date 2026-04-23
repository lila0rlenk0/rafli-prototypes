'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LeftColoredCard, RightColoredCard } from './decorations';
import {
	PaymentStatusExpired,
	PaymentStatusLoading,
	PaymentStatusUnpaid,
} from './messages';
import { PaymentStatusPaid } from './paid';
import { PaymentStatusVerificationFailed } from './verification-failed';
import { useStripeVerificationPoll } from './use-stripe-verification-poll';
import {
	buildStripeVerificationReturnTo,
	getStripeVerificationFailureCopy,
} from './state';
import { useUserStore } from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

interface PaymentStatusModalProps {
	publicSlug: string;
	/** Stripe checkout session ID — used to verify actual payment status. */
	stripeSessionId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Post-Stripe redirect modal — verifies payment status with the backend
 * before showing success. Polls until a terminal state is reached so
 * "success" is never claimed based on URL params alone. Visuals are
 * split across sibling subcomponents; polling lives in a dedicated
 * hook.
 */
export function PaymentStatusModal({
	publicSlug,
	stripeSessionId,
	open,
	onOpenChange,
}: PaymentStatusModalProps) {
	const mode = useUserStore(s => s.mode);
	const isParticipant = mode === USER_MODE.PARTICIPANT;

	const { status, verificationError, retryVerification } =
		useStripeVerificationPoll({ open, stripeSessionId });

	const verificationFailureCopy =
		getStripeVerificationFailureCopy(verificationError);
	const signInHref = `/sign-in?returnTo=${encodeURIComponent(
		buildStripeVerificationReturnTo(publicSlug, stripeSessionId),
	)}`;

	function renderContent() {
		switch (status) {
			case 'loading':
				return <PaymentStatusLoading />;
			case 'paid':
				return (
					<PaymentStatusPaid
						publicSlug={publicSlug}
						isParticipant={isParticipant}
					/>
				);
			case 'unpaid':
				return <PaymentStatusUnpaid isParticipant={isParticipant} />;
			case 'expired':
				return <PaymentStatusExpired />;
			case 'verification-failed':
				return (
					<PaymentStatusVerificationFailed
						copy={verificationFailureCopy}
						signInHref={signInHref}
						isParticipant={isParticipant}
						onClose={() => onOpenChange(false)}
						onRetry={retryVerification}
					/>
				);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-ink-alpha max-w-2xl border py-24">
				{status === 'paid' ? (
					<>
						<LeftColoredCard className="absolute top-0 left-0" />
						<RightColoredCard className="absolute top-0 right-0" />
					</>
				) : null}
				{renderContent()}
			</DialogContent>
		</Dialog>
	);
}
