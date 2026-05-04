'use client';

import { useState } from 'react';

import { CancelSubscriptionDialog } from '@/components/pricing/subscribe/cancel-subscription-dialog';
import { Button } from '@/components/ui/button';
import { SUBSCRIPTION_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import type { MySubscription } from '@/types/subscription';

interface CancelSubscriptionCardProps {
	readonly subscription: MySubscription;
}

/**
 * Outlined "Cancel subscription" card rendered on `/pricing` for users with
 * an active, not-yet-cancelled subscription. Owns the open state for the
 * confirm/success dialog and snapshots the plan name + subscription id at
 * dialog open time so the dialog body has stable references through the
 * mutation lifecycle.
 *
 * Visibility gate (active + cancelledAt === null) lives in the parent page
 * — this component assumes the user is allowed to cancel and reaches for
 * the dialog directly.
 *
 * @returns Card with secondary CTA that opens the cancellation dialog.
 */
export function CancelSubscriptionCard({
	subscription,
}: CancelSubscriptionCardProps) {
	const [isOpen, setIsOpen] = useState(false);

	function handleOpen() {
		// Funnel-step analytics: capture intent the moment the dialog opens, not
		// only when the cancel is confirmed. The drop-off between
		// `CANCEL_REQUESTED` and `CANCEL_CONFIRMED` is the metric the retention
		// dialog actually exists to influence.
		track(SUBSCRIPTION_EVENTS.CANCEL_REQUESTED, {
			subscription_id: subscription.id,
			plan_id: subscription.plan.id,
		});
		setIsOpen(true);
	}

	return (
		<>
			<section className="border-ink-150 flex w-full flex-col gap-6 rounded-3xl border bg-white px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-12">
				<div className="text-foreground flex flex-col gap-2">
					<h3 className="text-headline-sm font-semibold">
						Cancel subscription
					</h3>
					<p className="text-body-sm">
						You&rsquo;ll keep access to your perks until your next billing date.
						After that, you&rsquo;ll lose your monthly free entries,
						subscriber-only pools, and entry discounts.
					</p>
				</div>
				<Button
					variant="outline"
					size="lg"
					className="rounded-full px-6 font-semibold sm:shrink-0"
					onClick={handleOpen}
				>
					Cancel subscription
				</Button>
			</section>
			<CancelSubscriptionDialog
				open={isOpen}
				onOpenChange={setIsOpen}
				subscriptionId={subscription.id}
				planName={subscription.plan.name}
			/>
		</>
	);
}
