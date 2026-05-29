'use client';

import { Loader2Icon } from 'lucide-react';

import { PaymentModalDecor } from '@/assets/payment-modal-decor';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useOrder } from '@/services/order/use-order';
import { useRaffle } from '@/services/raffle/use-raffle';
import { useMyTicketsTotal } from '@/services/ticket/use-my-tickets-total';
import { useUserStore } from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

import {
	PaymentStatusExpired,
	PaymentStatusLoading,
	PaymentStatusUnpaid,
} from './messages';
import { PaymentStatusPaid } from './paid';
import { PaymentStatusVerificationFailed } from './verification-failed';
import {
	buildStripeVerificationReturnTo,
	getStripeVerificationFailureCopy,
} from './state';
import { useStripeVerificationPoll } from './use-stripe-verification-poll';

interface PaymentStatusModalProps {
	publicSlug: string;
	/** Raffle title — forwarded to the paid body so the share copy + locked-in
	 * line name the specific sweepstakes. */
	raffleTitle: string;
	/** Stripe checkout session ID — used to verify actual payment status. */
	stripeSessionId: string;
	/** Raffle id — drives the post-paid client fetch for the user's authoritative
	 * ticket total. Decoupled from the order's `raffleId` so the fetch can start
	 * before the order resolves. */
	raffleId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

// Same shell classes as `EntriesConfirmedModal` — keeps the two celebration
// surfaces visually identical despite their different entry points.
const PAID_CONTENT_CLASS_NAME =
	'border-ink-alpha [&_[data-slot=dialog-close]]:bg-background/80 gap-8 overflow-hidden max-lg:inset-0 max-lg:flex max-lg:max-w-none max-lg:translate-x-0 max-lg:translate-y-0 max-lg:flex-col max-lg:justify-center max-lg:overflow-y-auto max-lg:rounded-none max-lg:border-0 max-lg:px-6 max-lg:pt-24 max-lg:pb-12 lg:max-w-(--container-card-md) lg:rounded-3xl lg:px-12 lg:py-16 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:size-11 [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:opacity-100 [&_[data-slot=dialog-close]]:backdrop-blur-sm';

const TRANSIENT_CONTENT_CLASS_NAME = 'border-ink-alpha max-w-2xl border py-24';

/**
 * Post-Stripe redirect modal — verifies payment status with the backend
 * before showing success. Polls until a terminal state is reached so
 * "success" is never claimed based on URL params alone.
 *
 * Paid-state shell mirrors `EntriesConfirmedModal`: same chrome, same decor,
 * same celebration body (`EntriesConfirmedBody`). Three extra client queries
 * fire after the poll lands on paid: the order (for `ticketQuantity`), the
 * raffle (for the current pool count), and the user's ticket total (for the
 * authoritative "Your Entries" figure). Those gates collapse into a short
 * spinner before the celebration renders.
 *
 * Non-paid statuses keep the simpler shell — they're transient and
 * shouldn't read as celebration.
 *
 * @returns Dialog wrapping the appropriate status frame
 */
export function PaymentStatusModal({
	publicSlug,
	raffleTitle,
	stripeSessionId,
	raffleId,
	open,
	onOpenChange,
}: PaymentStatusModalProps) {
	const mode = useUserStore(function readMode(s) {
		return s.mode;
	});
	const isParticipant = mode === USER_MODE.PARTICIPANT;

	const { status, verificationError, retryVerification, orderId } =
		useStripeVerificationPoll({ open, stripeSessionId });

	const isPaid = status === 'paid';

	// Paid-only gates keep unauthenticated / unpaid / expired
	// paths from issuing extra round-trips.
	const orderQuery = useOrder(orderId, { enabled: isPaid });
	const raffleQuery = useRaffle(publicSlug, { enabled: isPaid, authed: true });
	const ticketsTotalQuery = useMyTicketsTotal(raffleId, { enabled: isPaid });

	const verificationFailureCopy =
		getStripeVerificationFailureCopy(verificationError);
	const signInHref = `/sign-in?returnTo=${encodeURIComponent(
		buildStripeVerificationReturnTo(publicSlug, stripeSessionId),
	)}`;

	const paidDataReady =
		isPaid &&
		orderQuery.data !== undefined &&
		raffleQuery.data !== undefined &&
		ticketsTotalQuery.data !== undefined;
	const paidDataPending =
		isPaid &&
		!paidDataReady &&
		!orderQuery.isError &&
		!raffleQuery.isError &&
		!ticketsTotalQuery.isError;

	function renderContent() {
		if (status === 'loading') return <PaymentStatusLoading />;
		if (status === 'unpaid')
			return <PaymentStatusUnpaid isParticipant={isParticipant} />;
		if (status === 'expired') return <PaymentStatusExpired />;
		if (status === 'verification-failed') {
			return (
				<PaymentStatusVerificationFailed
					copy={verificationFailureCopy}
					signInHref={signInHref}
					isParticipant={isParticipant}
					onClose={function close() {
						onOpenChange(false);
					}}
					onRetry={retryVerification}
				/>
			);
		}

		// status === 'paid' from here on. Wait for both client queries to land
		// before rendering the body — keeps the celebration from flashing
		// undefined stats. If either errored, fall back to the verified-but-
		// data-missing state (renders the legacy success copy).
		if (paidDataPending) {
			return <PaidLoadingSpinner />;
		}

		if (!paidDataReady) {
			return (
				<PaymentStatusPaid
					publicSlug={publicSlug}
					raffleTitle={raffleTitle}
					isParticipant={isParticipant}
				/>
			);
		}

		return (
			<PaymentStatusPaid
				publicSlug={publicSlug}
				raffleTitle={raffleTitle}
				isParticipant={isParticipant}
				ticketQuantity={orderQuery.data.ticketQuantity}
				yourEntries={ticketsTotalQuery.data}
				totalInPool={raffleQuery.data.ticketsSoldCount}
			/>
		);
	}

	const contentClassName = isPaid
		? PAID_CONTENT_CLASS_NAME
		: TRANSIENT_CONTENT_CLASS_NAME;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={contentClassName}>
				{isPaid ? (
					// Same top-edge decor wrapper as `EntriesConfirmedModal`. The
					// outer div carries the ambient drift animation so the SVG's
					// `rotate-180` transform stays intact.
					<div
						aria-hidden
						className="motion-safe:animate-float-ambient pointer-events-none absolute top-0 left-0 z-0 w-full"
					>
						<PaymentModalDecor className="w-full rotate-180" />
					</div>
				) : null}
				{renderContent()}
			</DialogContent>
		</Dialog>
	);
}

/**
 * Brief spinner shown after Stripe verification succeeds but before the
 * order + ticket-total queries land. Short by design — both queries fire
 * the moment status flips to paid.
 *
 * @returns Centered loader inside the paid celebration shell
 */
function PaidLoadingSpinner() {
	return (
		<div className="relative z-10 flex flex-col items-center justify-center gap-3 py-12">
			<Loader2Icon className="text-ink-500 size-10 animate-spin" />
			<p className="text-ink-500 text-sm">Loading your entries…</p>
		</div>
	);
}
