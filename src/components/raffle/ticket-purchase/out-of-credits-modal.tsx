'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

import {
	SUBSCRIBE_PLAN_SLUGS,
	SUBSCRIBE_PLANS,
	type SubscribePlan,
} from '@/components/subscribe/plans';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

/**
 * The next tier up from each plan, by price (Basic → Starter → Pro). Pro is the
 * top tier, so it maps to null — a Pro subscriber out of credits is never shown
 * the upsell modal and continues straight to one-time payment.
 *
 * Keyed by the lower-cased tier word so it survives backend name variants
 * ("Pro Access Pass") the same way the entry block's accent matching does.
 */
const NEXT_TIER_BY_PLAN: Readonly<Record<string, SubscribePlan>> = {
	basic: SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.STARTER],
	starter: SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.PRO],
};

/**
 * Resolves the next tier up from the subscriber's current plan name, or null
 * when they're already on the top tier (Pro) or the plan is unknown.
 *
 * @param planName - The subscriber's current plan name
 * @returns The next plan up, or null when there's nothing to upsell
 */
export function getNextTierUp(planName: string | null): SubscribePlan | null {
	if (planName === null) return null;
	const normalized = planName.toLowerCase();
	const tier = Object.keys(NEXT_TIER_BY_PLAN).find(key =>
		normalized.includes(key),
	);
	return tier ? NEXT_TIER_BY_PLAN[tier] : null;
}

interface OutOfCreditsModalProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	/** The tier to upsell — resolved by the caller via `getNextTierUp`. */
	readonly nextTier: SubscribePlan;
	/** Number of entries the user was trying to buy — folds into the copy. */
	readonly quantity: number;
	/** Falls back to the one-time card/crypto purchase when the upgrade is declined. */
	readonly onDecline: () => void;
}

// Existing subscribers upgrade via the merchandised pricing grid, which
// highlights their current plan and the proposed upgrade side by side.
const UPGRADE_HREF = '/pricing';

/**
 * "You're out of credits" upsell shown when a subscriber with a zero balance
 * tries to enter. Promotes the next tier up (more monthly credits + a bigger
 * entry discount); declining drops the user into the one-time card/crypto
 * purchase at full retail. Never rendered for Pro subscribers — they have no
 * higher tier, so the caller continues straight to payment instead.
 *
 * @param props - Open state, the next tier, quantity, and the decline handler
 * @returns The out-of-credits upsell dialog
 */
export function OutOfCreditsModal({
	open,
	onOpenChange,
	nextTier,
	quantity,
	onDecline,
}: OutOfCreditsModalProps) {
	const entryWord = quantity === 1 ? 'entry' : 'entries';
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-ink-alpha sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-xl font-bold">
						<Sparkles className="text-brand-dark size-5" aria-hidden />
						You&apos;re out of credits
					</DialogTitle>
					<DialogDescription className="text-muted-foreground text-sm">
						You don&apos;t have enough credits for {quantity} {entryWord}.
						Upgrade to <span className="font-semibold">{nextTier.name}</span> to
						get{' '}
						<span className="font-semibold">
							${nextTier.payoutUsd} in credits
						</span>{' '}
						every month and {nextTier.savingsPercent}% off every entry.
					</DialogDescription>
				</DialogHeader>

				<div className="bg-brand-yellow border-brand-dark flex flex-col gap-1 rounded-2xl border p-4">
					<p className="text-brand-dark flex items-baseline justify-between text-sm font-semibold">
						<span>{nextTier.name}</span>
						<span>
							${nextTier.chargeUsd}
							<span className="text-brand-dark/70 text-xs font-normal">
								/mo
							</span>
						</span>
					</p>
					<p className="text-brand-dark/80 text-xs">
						${nextTier.payoutUsd} credits/mo · {nextTier.savingsPercent}% off
						every entry
						{nextTier.weeklyFreeEntries > 0
							? ` · ${nextTier.weeklyFreeEntries} free entries / week`
							: ''}
					</p>
				</div>

				<DialogFooter className="flex flex-col gap-2 sm:flex-col">
					<Button asChild size="lg" className="w-full">
						<Link href={UPGRADE_HREF}>
							Upgrade to {nextTier.name}
							<ArrowRight className="size-4" aria-hidden />
						</Link>
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="lg"
						onClick={onDecline}
						className="w-full"
					>
						Continue with one-time purchase
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
