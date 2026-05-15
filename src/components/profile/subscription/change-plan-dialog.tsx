'use client';

import { Check, Loader2 } from 'lucide-react';
import { useMemo, useTransition } from 'react';
import { toast } from 'sonner';

import { getChangePlanErrorMessage } from '@/components/pricing/subscribe/error-messages';
import { formatPrice } from '@/components/pricing/format-price';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/class-names';
import { formatDate } from '@/lib/utils/format/date-format';
import { changePlan } from '@/services/subscription/change-plan';
import { useInvalidateMySubscription } from '@/services/subscription/use-my-subscription';
import { usePlans } from '@/services/subscription/use-plans';
import {
	CHANGE_PLAN_EFFECTIVE,
	type ChangePlanEffective,
	type SubscriptionPlan,
	type SubscriptionProvider,
} from '@/types/subscription';

interface ChangePlanDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly subscriptionId: string;
	readonly currentPlanId: string;
	readonly currentPlanPrice: string;
	readonly currentPeriodEnd: string;
	/**
	 * Backend capability: true when the user's provider supports scheduled
	 * downgrades (Stripe). When false (Fanbasis), the downgrade CTA is
	 * disabled and a tooltip explains the alternate path (cancel first,
	 * then resubscribe after the current period ends).
	 */
	readonly canScheduleDowngrade: boolean;
	/**
	 * True iff the user already has a queued scheduled-change. When true,
	 * every plan-row CTA is disabled with an inline notice — the user has to
	 * cancel the queued change before queueing another one.
	 */
	readonly hasPendingChange: boolean;
	/**
	 * Provider the user is locked into for the remainder of their billing
	 * history. Used to filter the rendered plan list: plans whose
	 * `availableProviders` doesn't include `lockedProvider` would always
	 * produce a `PROVIDER_NOT_SUPPORTED` error on click, so hiding them
	 * client-side is a cleaner UX than letting the user discover the
	 * incompatibility via toast. Null only at the type-system level — the
	 * dialog never mounts without a `lockedProvider` because `canChangePlan`
	 * (and therefore the dialog's existence) requires a non-null capabilities
	 * envelope, which itself requires a non-null `lockedProvider`.
	 */
	readonly lockedProvider: SubscriptionProvider | null;
}

/**
 * Plan-switcher dialog opened from the profile subscription card.
 *
 * Fetches the full plan catalogue on open and renders one row per plan. The
 * row CTA branches on the direction relative to the user's current price:
 *
 * - Current plan        — "Current plan" badge, no CTA.
 * - Upgrade (higher $)  — "Upgrade now" (prorated charge today).
 * - Downgrade (lower $) — when `canScheduleDowngrade` is true, "Switch at
 *                         renewal" → schedule-at-period-end; otherwise the
 *                         CTA is disabled with a tooltip explaining the
 *                         Fanbasis cancel-then-resubscribe alternative.
 * - Any direction       — disabled when `hasPendingChange` is true, with an
 *                         inline notice prompting the user to cancel the
 *                         queued change first.
 *
 * The action response is a discriminated union — `redirect` triggers a
 * full-page nav to the Fanbasis hosted checkout; `in-place` / `scheduled`
 * toast success, invalidate the subscription cache, and close the dialog.
 *
 * @returns Dialog listing every plan with direction-aware CTAs.
 */
export function ChangePlanDialog({
	open,
	onOpenChange,
	subscriptionId,
	currentPlanId,
	currentPlanPrice,
	currentPeriodEnd,
	canScheduleDowngrade,
	hasPendingChange,
	lockedProvider,
}: ChangePlanDialogProps) {
	// Fetch the plan catalogue via React Query — gated on `open` so the dialog
	// only hits the network when first opened. Sort by `metadata.sortOrder` so
	// the row order mirrors the pricing page (Ops-authoritative key). Then
	// filter to rows the locked provider can actually serve — the BE would
	// reject the others with `PROVIDER_NOT_SUPPORTED`, so showing them would
	// be a guaranteed-failure click. The current plan row is always kept
	// (regardless of provider support, in case the catalogue raced an Ops
	// disable mid-session) so the "Current plan" indicator still anchors.
	const plansQuery = usePlans({ enabled: open });
	const plans = useMemo<SubscriptionPlan[] | null>(() => {
		if (!plansQuery.data) return null;
		const sorted = plansQuery.data.plans.toSorted(
			(a, b) => a.metadata.sortOrder - b.metadata.sortOrder,
		);
		if (lockedProvider === null) return sorted;
		return sorted.filter(
			plan =>
				plan.id === currentPlanId ||
				plan.availableProviders.includes(lockedProvider),
		);
	}, [plansQuery.data, lockedProvider, currentPlanId]);
	const isLoading = plansQuery.isPending;
	const loadError = plansQuery.isError;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-card-md overflow-y-auto bg-white sm:rounded-3xl">
				<DialogHeader className="text-left">
					<DialogTitle className="font-clash-display text-headline-sm text-foreground font-semibold">
						Change plan
					</DialogTitle>
					<DialogDescription className="text-body-sm text-foreground">
						Upgrade now (prorated charge today) or switch to a smaller plan at
						your next renewal.
					</DialogDescription>
				</DialogHeader>

				{hasPendingChange ? (
					<p
						role="status"
						className="bg-yellow-pale border-input text-body-sm text-foreground rounded-xl border px-4 py-3"
					>
						You have a scheduled change. Cancel it first to switch plans again.
					</p>
				) : null}

				<DialogBody
					isLoading={isLoading}
					loadError={loadError}
					plans={plans}
					subscriptionId={subscriptionId}
					currentPlanId={currentPlanId}
					currentPlanPrice={currentPlanPrice}
					currentPeriodEnd={currentPeriodEnd}
					canScheduleDowngrade={canScheduleDowngrade}
					hasPendingChange={hasPendingChange}
					onSuccess={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}

interface DialogBodyProps {
	readonly isLoading: boolean;
	readonly loadError: boolean;
	readonly plans: SubscriptionPlan[] | null;
	readonly subscriptionId: string;
	readonly currentPlanId: string;
	readonly currentPlanPrice: string;
	readonly currentPeriodEnd: string;
	readonly canScheduleDowngrade: boolean;
	readonly hasPendingChange: boolean;
	readonly onSuccess: () => void;
}

/**
 * Dialog content body — branches between loading / error / loaded states so
 * the three branches stay mutually exclusive (the prior inline layout
 * rendered the load-error message AND the spinner at the same time because
 * `plans === null` is still true while `isError` is true).
 *
 * `role="status"` on the spinner so screen readers announce the loading
 * state without us having to wire an `aria-live` region.
 */
function DialogBody({
	isLoading,
	loadError,
	plans,
	subscriptionId,
	currentPlanId,
	currentPlanPrice,
	currentPeriodEnd,
	canScheduleDowngrade,
	hasPendingChange,
	onSuccess,
}: DialogBodyProps) {
	if (loadError) {
		return (
			<p role="alert" className="text-body-sm text-foreground py-8 text-center">
				Couldn&rsquo;t load plans. Close this dialog and try again.
			</p>
		);
	}

	if (isLoading || plans === null) {
		return (
			<div
				role="status"
				aria-label="Loading plans"
				className="flex items-center justify-center gap-3 py-12"
			>
				{/* Animated spinner for typical users; hidden under reduced-motion
				    preference. The sibling text keeps the loading affordance
				    visible (and announced via aria-label on the wrapper) when the
				    spin transform is suppressed. */}
				<Loader2
					aria-hidden
					className="text-foreground size-6 animate-spin motion-reduce:hidden"
				/>
				<span className="text-body-sm text-foreground motion-safe:sr-only">
					Loading plans…
				</span>
			</div>
		);
	}

	return (
		<ul className="flex flex-col gap-3">
			{plans.map(plan => (
				<PlanRow
					key={plan.id}
					plan={plan}
					subscriptionId={subscriptionId}
					currentPlanId={currentPlanId}
					currentPlanPrice={currentPlanPrice}
					currentPeriodEnd={currentPeriodEnd}
					canScheduleDowngrade={canScheduleDowngrade}
					hasPendingChange={hasPendingChange}
					onSuccess={onSuccess}
				/>
			))}
		</ul>
	);
}

interface PlanRowProps {
	readonly plan: SubscriptionPlan;
	readonly subscriptionId: string;
	readonly currentPlanId: string;
	readonly currentPlanPrice: string;
	readonly currentPeriodEnd: string;
	readonly canScheduleDowngrade: boolean;
	readonly hasPendingChange: boolean;
	readonly onSuccess: () => void;
}

function PlanRow({
	plan,
	subscriptionId,
	currentPlanId,
	currentPlanPrice,
	currentPeriodEnd,
	canScheduleDowngrade,
	hasPendingChange,
	onSuccess,
}: PlanRowProps) {
	const invalidateMySubscription = useInvalidateMySubscription();
	const [isPending, startTransition] = useTransition();

	const isCurrent = plan.id === currentPlanId;
	// `Number()` over `parseFloat` — both lose decimal precision on edge cases,
	// but `Number('9.99x')` returns NaN where `parseFloat` would return `9.99`.
	// We want the strict reading so a malformed price string surfaces as
	// neither upgrade nor downgrade (CTA hides) rather than silently mis-routing.
	const currentPrice = Number(currentPlanPrice);
	const planPrice = Number(plan.monthlyPriceAmount);
	const isUpgrade = !isCurrent && planPrice > currentPrice;
	const isDowngrade = !isCurrent && planPrice < currentPrice;
	const formattedPeriodEnd = formatDate(currentPeriodEnd);

	function executeChange(effective: ChangePlanEffective) {
		startTransition(async () => {
			const result = await changePlan({
				subscriptionId,
				newPlanId: plan.id,
				effective,
			});
			if (!result.success) {
				toast.error(getChangePlanErrorMessage(result.error));
				return;
			}
			if (result.data.kind === 'redirect') {
				// Fanbasis cancel-and-recreate path — full-page nav to upstream
				// hosted checkout. `assign` keeps the back button pointed at us.
				window.location.assign(result.data.checkoutUrl);
				return;
			}
			void invalidateMySubscription();
			if (result.data.kind === 'in-place') {
				toast.success(`You're now on ${result.data.planName}.`);
			} else {
				toast.success(
					`Switching to ${result.data.planName} on ${formatDate(result.data.effectiveAt)}.`,
				);
			}
			onSuccess();
		});
	}

	return (
		<li
			className={cn(
				// Base border is `border-2` on every row so the current-plan
				// border swap doesn't trigger a 1px layout shift on the neighbouring
				// rows when sorted by `sortOrder`. Non-current rows render
				// `border-input` (the same neutral the rest of the dialog uses);
				// the current row replaces it with `border-green-vivid` +
				// `bg-brand-mint/25` for the highlight without changing geometry.
				'flex flex-col gap-3 rounded-2xl border-2 p-4 sm:flex-row sm:items-center sm:justify-between',
				isCurrent ? 'border-green-vivid bg-brand-mint/25' : 'border-input',
			)}
		>
			<div className="flex flex-col gap-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-foreground text-base font-semibold">
						{plan.name}
					</span>
					{isCurrent ? (
						<span className="bg-brand-mint text-mini tracking-micro-5 text-green-forest inline-flex items-center rounded-md px-2 py-0.5 font-semibold uppercase">
							Current plan
						</span>
					) : null}
				</div>
				<span className="text-body-sm text-foreground">
					{formatPrice(plan.monthlyPriceAmount)} / month
				</span>
			</div>

			<PlanRowCTA
				isCurrent={isCurrent}
				isUpgrade={isUpgrade}
				isDowngrade={isDowngrade}
				canScheduleDowngrade={canScheduleDowngrade}
				hasPendingChange={hasPendingChange}
				formattedPeriodEnd={formattedPeriodEnd}
				isPending={isPending}
				onUpgrade={() => executeChange(CHANGE_PLAN_EFFECTIVE.NOW)}
				onDowngrade={() => executeChange(CHANGE_PLAN_EFFECTIVE.PERIOD_END)}
			/>
		</li>
	);
}

interface PlanRowCTAProps {
	readonly isCurrent: boolean;
	readonly isUpgrade: boolean;
	readonly isDowngrade: boolean;
	readonly canScheduleDowngrade: boolean;
	readonly hasPendingChange: boolean;
	readonly formattedPeriodEnd: string;
	readonly isPending: boolean;
	readonly onUpgrade: () => void;
	readonly onDowngrade: () => void;
}

/**
 * Direction-aware CTA cell. Extracted from `PlanRow` to keep the row body
 * inside the project's max-lines-per-function ESLint cap; the branching
 * (current / upgrade / scheduled-downgrade / blocked-downgrade) reads more
 * cleanly as a single function than as inline ternaries.
 *
 * Exported so the test suite can render each branch without spinning up the
 * full React-Query-backed dialog.
 */
export function PlanRowCTA({
	isCurrent,
	isUpgrade,
	isDowngrade,
	canScheduleDowngrade,
	hasPendingChange,
	formattedPeriodEnd,
	isPending,
	onUpgrade,
	onDowngrade,
}: PlanRowCTAProps) {
	if (isCurrent) {
		return (
			<div className="text-foreground inline-flex items-center gap-1 text-sm font-medium">
				<Check
					aria-hidden
					className="text-green-vivid size-4"
					strokeWidth={3}
				/>
				<span>Current plan</span>
			</div>
		);
	}

	if (isUpgrade) {
		return (
			<div className="flex flex-col items-start gap-1 sm:items-end">
				<Button
					type="button"
					size="sm"
					onClick={onUpgrade}
					disabled={hasPendingChange || isPending}
					aria-busy={isPending}
					className="rounded-full px-4 font-semibold"
				>
					{isPending ? (
						<>
							<Loader2 className="size-4 animate-spin" aria-hidden />
							<span>Upgrading…</span>
						</>
					) : (
						'Upgrade now'
					)}
				</Button>
				<span className="text-foreground/70 text-xs">
					Prorated charge today
				</span>
			</div>
		);
	}

	if (isDowngrade && canScheduleDowngrade) {
		return (
			<div className="flex flex-col items-start gap-1 sm:items-end">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onDowngrade}
					disabled={hasPendingChange || isPending}
					aria-busy={isPending}
					className="border-brand-dark rounded-full px-4 font-semibold"
				>
					{isPending ? (
						<>
							<Loader2 className="size-4 animate-spin" aria-hidden />
							<span>Scheduling…</span>
						</>
					) : (
						'Switch at renewal'
					)}
				</Button>
				<span className="text-foreground/70 text-xs">
					Takes effect {formattedPeriodEnd}
				</span>
			</div>
		);
	}

	// Downgrade on a provider without native scheduling (Fanbasis): disabled
	// CTA + tooltip explaining the cancel-then-resubscribe alternative.
	if (isDowngrade) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span tabIndex={0}>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled
							className="border-input rounded-full px-4 font-semibold"
						>
							Switch at renewal
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>
					Downgrades require cancelling first. Your new plan starts after{' '}
					{formattedPeriodEnd}.
				</TooltipContent>
			</Tooltip>
		);
	}

	return null;
}
