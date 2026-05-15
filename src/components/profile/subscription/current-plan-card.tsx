'use client';

import { Loader2, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useOpenBillingPortal } from '@/components/pricing/subscribe/use-open-billing-portal';
import { CancelSubscriptionDialog } from '@/components/profile/subscription/cancel-subscription-dialog';
import { ChangePlanDialog } from '@/components/profile/subscription/change-plan-dialog';
import { ScheduledChangeBanner } from '@/components/profile/subscription/scheduled-change-banner';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import { formatDate } from '@/lib/utils/format/date-format';
import type {
	MySubscription,
	SubscriptionCapabilities,
	SubscriptionProvider,
} from '@/types/subscription';

interface CurrentPlanCardProps {
	readonly subscription: MySubscription | null;
	readonly capabilities: SubscriptionCapabilities | null;
	/**
	 * Provider the user is locked into for the remainder of their billing
	 * history. Threaded into `ChangePlanDialog` so the row list filters out
	 * plans the locked provider can't serve (e.g. a Stripe-only plan for a
	 * Fanbasis-locked user). Null only for first-time buyers, but the change-
	 * plan surface never renders for those — it lives behind `canChangePlan`,
	 * which is itself false when `capabilities` is null.
	 */
	readonly lockedProvider: SubscriptionProvider | null;
}

/**
 * Profile subscription management card — single owner of cancel + change-plan +
 * payment-method affordances for the authenticated viewer.
 *
 * Empty state (no subscription): renders an inline CTA pointing at /pricing
 * where acquisition lives. Subscribed state: surface plan summary,
 * renewal/end date, scheduled-change banner (when queued), and the three
 * management CTAs gated by the backend capabilities matrix.
 *
 * The wrapper anchors `id="subscription"` so deep links from the pricing
 * page (`/profile#subscription`) and any other manage-from-elsewhere
 * trigger scroll directly to this card. Lifted onto a single `<section>`
 * here (not duplicated across both inner branches) so the anchor target is
 * unambiguous regardless of subscription state.
 *
 * @returns Subscription summary + management surface, or empty-state upsell.
 */
export function CurrentPlanCard({
	subscription,
	capabilities,
	lockedProvider,
}: CurrentPlanCardProps) {
	return (
		<section
			id="subscription"
			aria-labelledby="subscription-heading"
			className="relative flex w-full flex-col gap-4 overflow-hidden rounded-3xl bg-white px-6 py-10 md:px-10 md:py-12"
		>
			<h3
				id="subscription-heading"
				className="font-clash-display text-headline-md font-semibold text-black"
			>
				Subscription
			</h3>
			{subscription === null ? (
				<EmptyState />
			) : (
				<SubscribedCard
					subscription={subscription}
					capabilities={capabilities}
					lockedProvider={lockedProvider}
				/>
			)}
		</section>
	);
}

function EmptyState() {
	return (
		<>
			<p className="text-body-sm text-foreground">
				You don&rsquo;t have an active subscription. Pick a plan to unlock
				weekly free entries, subscriber-only pools, and entry discounts.
			</p>
			<div>
				<Button asChild size="lg" className="rounded-full px-6 font-semibold">
					<Link href="/pricing">View plans</Link>
				</Button>
			</div>
		</>
	);
}

interface SubscribedCardProps {
	readonly subscription: MySubscription;
	readonly capabilities: SubscriptionCapabilities | null;
	readonly lockedProvider: SubscriptionProvider | null;
}

/**
 * Collapses the capabilities matrix (plus the cancelled-but-still-active gate)
 * into the flat shape `SubscribedCard` consumes. Extracted to keep
 * `SubscribedCard` under the project's complexity cap — every `?? false` default
 * + the `cancelledAt` derivation lives here.
 *
 * Every capability defaults to `false` because the management surface should
 * stay quiet (no CTAs) when the BE hasn't blessed the user; this is the
 * inverse of pricing-side defaults which lean toward "show the CTA" because
 * they're optimising for conversion, not for safe self-serve gating.
 */
function resolveSubscriptionGates(
	subscription: MySubscription,
	capabilities: SubscriptionCapabilities | null,
) {
	const isCancelled =
		subscription.cancelledAt !== null || subscription.status === 'cancelled';
	// Both fields gate the "has pending change" state — the schema refinement
	// guarantees they move as a pair, but reading both keeps the gate
	// consistent with `ScheduledChangeBanner`'s visibility check (same two
	// fields). A future BE that ever sends a half-populated shape would no
	// longer parse, so this stays a defense-in-depth check, not a workaround.
	const hasPendingChange =
		!!subscription.pendingPlan && !!subscription.pendingPlanEffectiveAt;
	return {
		isCancelled,
		canChangePlan: !isCancelled && (capabilities?.canChangePlan ?? false),
		canCancel: !isCancelled && (capabilities?.canCancel ?? false),
		canUpdatePaymentMethod: capabilities?.canUpdatePaymentMethod ?? false,
		hasSelfServePortal: capabilities?.hasSelfServePortal ?? false,
		canScheduleDowngrade: capabilities?.canScheduleDowngrade ?? false,
		canCancelScheduledChange: capabilities?.canCancelScheduledChange ?? false,
		hasPendingChange,
	};
}

function SubscribedCard({
	subscription,
	capabilities,
	lockedProvider,
}: SubscribedCardProps) {
	const [isChangeOpen, setIsChangeOpen] = useState(false);
	const [isCancelOpen, setIsCancelOpen] = useState(false);

	const { plan, currentPeriodEnd, pendingPlan } = subscription;
	const gates = resolveSubscriptionGates(subscription, capabilities);

	const dateLabel = gates.isCancelled ? 'Ends' : 'Renews';
	const formattedDate = formatDate(currentPeriodEnd);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<Star className="size-5 shrink-0" aria-hidden />
					<span className="text-headline-sm text-foreground font-semibold">
						{plan.name}
					</span>
				</div>
				<span className="text-body-sm text-foreground">
					{formatCurrency(plan.monthlyPriceAmount, 'USD')} / month · {dateLabel}{' '}
					{formattedDate}
				</span>
			</div>

			<ScheduledChangeBanner
				subscriptionId={subscription.id}
				pendingPlan={pendingPlan ?? null}
				effectiveAt={subscription.pendingPlanEffectiveAt ?? null}
				canCancel={gates.canCancelScheduledChange}
			/>

			<ManagementCTAs
				canChangePlan={gates.canChangePlan}
				canCancel={gates.canCancel}
				canUpdatePaymentMethod={gates.canUpdatePaymentMethod}
				hasSelfServePortal={gates.hasSelfServePortal}
				onOpenChange={() => setIsChangeOpen(true)}
				onOpenCancel={() => setIsCancelOpen(true)}
			/>

			{gates.canChangePlan ? (
				<ChangePlanDialog
					open={isChangeOpen}
					onOpenChange={setIsChangeOpen}
					subscriptionId={subscription.id}
					currentPlanId={plan.id}
					currentPlanPrice={plan.monthlyPriceAmount}
					currentPeriodEnd={currentPeriodEnd}
					canScheduleDowngrade={gates.canScheduleDowngrade}
					hasPendingChange={gates.hasPendingChange}
					lockedProvider={lockedProvider}
				/>
			) : null}

			{gates.canCancel ? (
				<CancelSubscriptionDialog
					open={isCancelOpen}
					onOpenChange={setIsCancelOpen}
					subscriptionId={subscription.id}
					planName={plan.name}
					currentPeriodEnd={currentPeriodEnd}
				/>
			) : null}
		</div>
	);
}

interface ManagementCTAsProps {
	readonly canChangePlan: boolean;
	readonly canCancel: boolean;
	readonly canUpdatePaymentMethod: boolean;
	readonly hasSelfServePortal: boolean;
	readonly onOpenChange: () => void;
	readonly onOpenCancel: () => void;
}

/**
 * Three pill buttons gated by the capability matrix. Extracted so the parent
 * card stays inside the project's complexity cap. Update-payment-method is
 * portal-only — Stripe has the hosted UX, Fanbasis has no portal product, so
 * the button hides unless both gates are true.
 */
function ManagementCTAs({
	canChangePlan,
	canCancel,
	canUpdatePaymentMethod,
	hasSelfServePortal,
	onOpenChange,
	onOpenCancel,
}: ManagementCTAsProps) {
	const { open: openPortal, isPending: isPortalPending } =
		useOpenBillingPortal();
	const showPortal = hasSelfServePortal && canUpdatePaymentMethod;

	return (
		<div className="flex flex-wrap gap-3">
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="border-brand-dark hover:bg-brand-dark px-6 font-semibold hover:text-white"
				disabled={!canChangePlan}
				onClick={onOpenChange}
			>
				Change plan
			</Button>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="border-brand-dark hover:bg-brand-dark px-6 font-semibold hover:text-white"
				disabled={!canCancel}
				onClick={onOpenCancel}
			>
				Cancel subscription
			</Button>
			{showPortal ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="border-brand-dark hover:bg-brand-dark px-6 font-semibold hover:text-white"
					onClick={openPortal}
					disabled={isPortalPending}
					aria-busy={isPortalPending}
				>
					{isPortalPending ? (
						<>
							<Loader2 className="size-4 animate-spin" aria-hidden />
							<span>Opening…</span>
						</>
					) : (
						'Update payment method'
					)}
				</Button>
			) : null}
		</div>
	);
}
