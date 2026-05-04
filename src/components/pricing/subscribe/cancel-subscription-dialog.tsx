'use client';

import { HeartCrack, Loader2, TicketX, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CancellationDecor } from '@/components/pricing/subscribe/cancellation-decor';
import { getCancelErrorMessage } from '@/components/pricing/subscribe/error-messages';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils/format/date-format';
import { useCancelSubscription } from '@/services/subscription/use-cancel-subscription';

// Loss-aversion copy from the Figma cancellation flow. Module-scoped so the
// array reference is stable across renders — React doesn't re-key the list
// on every dialog open. Mirrors the four perks called out by Marketing.
const LOST_BENEFITS: readonly string[] = [
	'5 free entries to the weekly pool',
	'Access to subscriber-only pools',
	'Expired credits convert into entries for the monthly pool',
	'Exclusive deals, partner offers, and FREE access to a 10k+ content library with online tips & tricks',
];

// Typography snapshot — pulled out so confirm + success bodies render the
// same headline shape without drift. Matches the Figma H2-Desktop spec
// (Clash Display Semibold, 36px). The headline-lg token already encodes
// letter-spacing via `--text-headline-lg--letter-spacing` in globals.css,
// so no inline tracking override is needed here.
const HEADLINE_CLASS =
	'font-clash-display text-headline-lg text-foreground font-semibold';
const DESCRIPTION_CLASS = 'text-body-sm text-foreground';
const PRIMARY_CTA_CLASS = 'h-12 rounded-full px-6 font-semibold';

interface CancelSubscriptionDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	/** Local subscription UUID — backend authoritative for ownership. */
	readonly subscriptionId: string;
	/** Plan name snapshot — preserved across confirm→success because the
	 * cancel response only returns `{ expiresAt, status }`. */
	readonly planName: string;
}

// Two-state dialog mirroring the EnrolledBody/FinalizingBody pattern from
// `subscription-success-dialog.tsx`. State transitions live in the parent
// (`CancelSubscriptionDialog`) so the body components stay pure.
type DialogState = { kind: 'confirm' } | { kind: 'success'; expiresAt: string };

const CONFIRM_STATE: DialogState = { kind: 'confirm' };

/**
 * Self-serve cancellation dialog opened from the `/pricing` cancel card.
 *
 * Confirm body shows a loss-framed benefit list with a primary "stay" CTA
 * and a secondary "cancel and lose perks" CTA. The cancel CTA fires the
 * mutation; on success the body swaps to a confirmation that surfaces
 * `expiresAt` (end of current billing period) so the user knows when their
 * benefits actually lapse.
 *
 * Errors render via toast through `getCancelErrorMessage` — `NOT_ACTIVE`
 * (already cancelled) and `NOT_FOUND` get cancel-specific copy; everything
 * else falls through to `SHARED_MESSAGES`.
 *
 * @returns Two-state dialog: confirmation prompt then success acknowledgement.
 */
export function CancelSubscriptionDialog({
	open,
	onOpenChange,
	subscriptionId,
	planName,
}: CancelSubscriptionDialogProps) {
	const [state, setState] = useState<DialogState>(CONFIRM_STATE);
	const cancelMutation = useCancelSubscription();

	function handleConfirmCancel() {
		cancelMutation.mutate(
			{ subscriptionId },
			{
				onSuccess: function transitionToSuccess(data) {
					setState({ kind: 'success', expiresAt: data.expiresAt });
				},
				onError: function showCancelError(error) {
					toast.error(getCancelErrorMessage(error.code));
				},
			},
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="border-brand-dark max-w-card-md overflow-hidden bg-white sm:rounded-3xl sm:border-2"
				// Defensive reset — once focus returns to the trigger after a
				// close animation, snap back to the confirm body so a re-open
				// (rare: card hides on `cancelledAt !== null`) starts fresh.
				onCloseAutoFocus={() => setState(CONFIRM_STATE)}
			>
				{state.kind === 'confirm' ? (
					<ConfirmBody
						planName={planName}
						isPending={cancelMutation.isPending}
						onStay={() => onOpenChange(false)}
						onConfirm={handleConfirmCancel}
					/>
				) : (
					<SuccessBody
						planName={planName}
						expiresAt={state.expiresAt}
						onDone={() => onOpenChange(false)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

interface ConfirmBodyProps {
	readonly planName: string;
	readonly isPending: boolean;
	readonly onStay: () => void;
	readonly onConfirm: () => void;
}

function ConfirmBody({
	planName,
	isPending,
	onStay,
	onConfirm,
}: ConfirmBodyProps) {
	return (
		// `relative` anchors the absolutely-positioned decor SVG to the body.
		// `pt-32` reserves vertical room for the icon to sit clear of the
		// decor's top band — without the offset the HeartCrack would land
		// inside the colored card cluster on smaller viewports.
		<div className="relative flex flex-col items-center gap-10 p-2 pt-32 text-center sm:px-4">
			<CancellationDecor />
			<HeartCrack
				aria-hidden
				className="text-foreground relative size-28"
				strokeWidth={2}
			/>
			<DialogHeader className="gap-4 text-center sm:text-center">
				<DialogTitle className={HEADLINE_CLASS}>
					You&rsquo;ll lose more than you think&hellip;
				</DialogTitle>
				<DialogDescription className={DESCRIPTION_CLASS}>
					Cancelling your <span className="font-semibold">{planName}</span>{' '}
					subscription means giving up:
				</DialogDescription>
			</DialogHeader>
			<ul className="flex flex-col items-start gap-6">
				{LOST_BENEFITS.map(function renderBenefit(copy) {
					return (
						<li key={copy} className="flex items-center gap-4">
							<span className="bg-status-cancelled-soft flex size-6 shrink-0 items-center justify-center rounded-lg">
								<X
									aria-hidden
									className="text-status-cancelled size-4"
									strokeWidth={3}
								/>
							</span>
							<span className="text-body-sm text-foreground text-left">
								{copy}
							</span>
						</li>
					);
				})}
			</ul>
			<div className="flex w-full flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:gap-8">
				<Button
					size="lg"
					className={PRIMARY_CTA_CLASS}
					onClick={onStay}
					disabled={isPending}
				>
					Never mind, I&rsquo;m staying!
				</Button>
				<Button
					variant="outline"
					size="lg"
					className={PRIMARY_CTA_CLASS}
					onClick={onConfirm}
					disabled={isPending}
					aria-busy={isPending}
				>
					{isPending ? (
						<>
							<Loader2 className="animate-spin" aria-hidden />
							<span>Cancelling&hellip;</span>
						</>
					) : (
						'Cancel and lose my perks'
					)}
				</Button>
			</div>
		</div>
	);
}

interface SuccessBodyProps {
	readonly planName: string;
	readonly expiresAt: string;
	readonly onDone: () => void;
}

function SuccessBody({ planName, expiresAt, onDone }: SuccessBodyProps) {
	const formattedExpiresAt = formatDate(expiresAt);

	return (
		<div className="flex flex-col items-center gap-10 p-2 text-center sm:px-4">
			<TicketX
				aria-hidden
				className="text-foreground size-26"
				strokeWidth={2}
			/>
			<DialogHeader className="gap-4 text-center sm:text-center">
				<DialogTitle className={HEADLINE_CLASS}>
					Your subscription is cancelled
				</DialogTitle>
				<DialogDescription className={DESCRIPTION_CLASS}>
					You&rsquo;ll keep your{' '}
					<span className="font-semibold">{planName}</span> perks until{' '}
					{formattedExpiresAt}. After that, your account stays active but
					you&rsquo;ll lose your free weekly entries, subscriber-only pools, and
					entry discounts.
					<br />
					We&rsquo;ve sent a confirmation to your email.
				</DialogDescription>
			</DialogHeader>
			<Button size="lg" className={PRIMARY_CTA_CLASS} onClick={onDone}>
				Done
			</Button>
		</div>
	);
}
