'use client';

import { PaymentModalDecor } from '@/assets/payment-modal-decor';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
	/** Raffle title — forwarded to the paid view so the share copy names
	 * the specific sweepstakes, matching the entries-confirmed modal that
	 * fires on the in-page credits + free-tickets flows. */
	raffleTitle: string;
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
 *
 * Paid-state shell mirrors `EntriesConfirmedModal`: same fullscreen
 * `max-lg:` overrides, same rounded-3xl desktop chrome, same top-edge
 * decor anchor. Stripe-return users and in-page credits/free-tickets
 * users converge on a visually identical confirmation moment despite
 * the two flows entering the modal from different code paths.
 *
 * Non-paid statuses (loading / unpaid / expired / verification-failed)
 * keep the original simpler shell — no decor, no fullscreen — because
 * they're transient and shouldn't read as celebration.
 */
export function PaymentStatusModal({
	publicSlug,
	raffleTitle,
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

	const isPaid = status === 'paid';

	function renderContent() {
		switch (status) {
			case 'loading':
				return <PaymentStatusLoading />;
			case 'paid':
				return (
					<PaymentStatusPaid
						publicSlug={publicSlug}
						raffleTitle={raffleTitle}
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

	// Paid state uses the celebration shell (matches `EntriesConfirmedModal`).
	// Other states keep the original transient shell so error / loading copy
	// isn't framed by celebratory decor.
	// Close button overrides on the celebration shell — shadcn's DialogClose
	// is content-sized (the 16px X icon alone), which fails the 44×44 mobile
	// touch-target rule and is hard to see/tap against the rotated
	// PaymentModalDecor at the top edge. The `[&_[data-slot=dialog-close]]:*`
	// chain expands the hit area, lifts it above the decor (`z-20`), and adds
	// a translucent chip so the X reads against the colored shapes.
	const contentClassName = isPaid
		? 'border-ink-alpha gap-10 overflow-hidden max-lg:inset-0 max-lg:flex max-lg:max-w-none max-lg:translate-x-0 max-lg:translate-y-0 max-lg:flex-col max-lg:justify-center max-lg:overflow-y-auto max-lg:rounded-none max-lg:border-0 max-lg:px-6 max-lg:pt-32 max-lg:pb-12 lg:max-w-(--container-card-md) lg:rounded-3xl lg:px-12 lg:py-20 [&_[data-slot=dialog-close]]:bg-background/80 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:size-11 [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:opacity-100 [&_[data-slot=dialog-close]]:backdrop-blur-sm'
		: 'border-ink-alpha max-w-2xl border py-24';

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={contentClassName}>
				{isPaid ? (
					<PaymentModalDecor
						className="pointer-events-none absolute top-0 left-0 z-0 w-full rotate-180"
						aria-hidden
					/>
				) : null}
				{renderContent()}
			</DialogContent>
		</Dialog>
	);
}
