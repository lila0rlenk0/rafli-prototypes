'use client';

import { CalendarClock, Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { getCancelScheduledChangeOutcome } from '@/components/pricing/subscribe/error-messages';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/format/date-format';
import { cancelScheduledChange } from '@/services/subscription/cancel-scheduled-change';
import { useInvalidateMySubscription } from '@/services/subscription/use-my-subscription';
import type { PendingPlan } from '@/types/subscription';

interface ScheduledChangeBannerProps {
	readonly subscriptionId: string;
	/**
	 * Plan queued to take effect at `effectiveAt`. Non-null is the visibility
	 * gate — the banner renders only when the caller has a pending swap to
	 * surface. Null/undefined: the banner returns `null` and lets the layout
	 * collapse.
	 */
	readonly pendingPlan: PendingPlan | null | undefined;
	/** ISO timestamp the pending swap activates — formatted for display only. */
	readonly effectiveAt: string | null | undefined;
	/**
	 * Backend-gated cancel-the-scheduled-change capability. Currently always
	 * true when `pendingPlan` is set (Stripe-only flow), but threaded through
	 * so a future provider with a non-cancellable schedule drops in via one
	 * BE mapping change rather than a UI revisit.
	 */
	readonly canCancel: boolean;
}

/**
 * Banner rendered on the profile subscription card when the authenticated
 * user has queued a downgrade to take effect at `effectiveAt`. Two affordances:
 *
 * - Status copy stating which plan kicks in and when.
 * - "Cancel scheduled change" CTA that restores the current plan as the
 *   renewal target. Disabled when `canCancel` is false (defensive — the
 *   backend gates the underlying endpoint identically).
 *
 * Errors render via toast through `getCancelErrorMessage` — the same mapper
 * the cancel-subscription dialog uses, since both surfaces share the
 * `subscription:not-found` / `not-active` semantics.
 *
 * @returns Yellow-warning banner with cancel-scheduled-change CTA, or null
 *   when no pending change is queued.
 */
export function ScheduledChangeBanner({
	subscriptionId,
	pendingPlan,
	effectiveAt,
	canCancel,
}: ScheduledChangeBannerProps) {
	const [isPending, startTransition] = useTransition();
	const invalidateMySubscription = useInvalidateMySubscription();

	if (!pendingPlan || !effectiveAt) {
		return null;
	}

	const formattedEffectiveAt = formatDate(effectiveAt);

	function handleCancelScheduledChange() {
		startTransition(async () => {
			const result = await cancelScheduledChange({ subscriptionId });
			if (result.success) {
				void invalidateMySubscription();
				toast.success(
					'Scheduled change cancelled. Your current plan continues.',
				);
				return;
			}
			// Two BE error codes are NOT failures from the user's POV — phase[1]
			// auto-applied between render and click, or another tab cancelled
			// first. Both leave the subscription in the state the user wanted, so
			// refetch and surface a soft outcome instead of an error toast. See
			// `getCancelScheduledChangeOutcome` for the classification.
			const outcome = getCancelScheduledChangeOutcome(result.error);
			if (outcome.kind === 'applied') {
				void invalidateMySubscription();
				toast.info(outcome.message);
				return;
			}
			if (outcome.kind === 'noop') {
				void invalidateMySubscription();
				return;
			}
			toast.error(outcome.message);
		});
	}

	return (
		<div
			role="status"
			className="bg-yellow-pale border-input flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between"
		>
			<div className="flex items-start gap-3">
				<CalendarClock
					aria-hidden
					className="text-foreground mt-0.5 size-5 shrink-0"
				/>
				<div className="flex flex-col gap-1">
					<p className="text-body-md text-foreground font-semibold">
						Downgrade scheduled
					</p>
					<p className="text-body-sm text-foreground">
						Downgrades to{' '}
						<span className="font-semibold">{pendingPlan.name}</span> on{' '}
						{formattedEffectiveAt}.
					</p>
				</div>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={handleCancelScheduledChange}
				disabled={!canCancel || isPending}
				aria-busy={isPending}
				className="border-brand-dark hover:bg-brand-dark px-4 font-semibold hover:text-white sm:shrink-0"
			>
				{isPending ? (
					<>
						<Loader2 className="size-4 animate-spin" aria-hidden />
						<span>Cancelling…</span>
					</>
				) : (
					'Cancel scheduled change'
				)}
			</Button>
		</div>
	);
}
