'use client';

import { ArrowRight, Check, Sparkles } from 'lucide-react';
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

interface PlanPerk {
	readonly text: string;
	/** Highlight chip (SAVE / NEW / Only PROs), or null for a plain bullet. */
	readonly tag: string | null;
}

/**
 * Punchy perk lines for the upsell card, synthesised from the plan config so
 * the copy mirrors the pricing page without re-typing it. Order leads with the
 * strongest levers (discount + monthly credits), then the tier extras.
 *
 * @param plan - The plan to describe
 * @returns The perk lines to render with check icons
 */
function planPerks(plan: SubscribePlan): readonly PlanPerk[] {
	const perks: PlanPerk[] = [
		{ text: `${plan.savingsPercent}% off every entry`, tag: 'SAVE' },
		{ text: `$${plan.payoutUsd} in credits every month`, tag: null },
	];
	if (plan.weeklyFreeEntries > 0) {
		perks.push({
			text: `${plan.weeklyFreeEntries} free entries every week`,
			tag: 'NEW',
		});
	}
	perks.push({
		text: 'FREE access to the 10k+ content library',
		tag: null,
	});
	return perks;
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
	const perks = planPerks(nextTier);
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-ink-alpha gap-5 sm:max-w-md">
				<DialogHeader className="gap-2">
					<span className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
						<Sparkles className="text-brand-dark size-4" aria-hidden />
						Out of credits
					</span>
					<DialogTitle className="font-clash-display text-3xl/none font-semibold tracking-tight">
						Go {nextTier.name} &amp; never run dry
					</DialogTitle>
					<DialogDescription className="text-muted-foreground text-sm">
						You don&apos;t have enough credits for {quantity} {entryWord}.
						Upgrade to <span className="text-foreground font-semibold">
							{nextTier.name}
						</span>{' '}
						for a bigger monthly credit drop and a steeper discount on every
						entry.
					</DialogDescription>
				</DialogHeader>

				{/* Highlighted upsell card — bright yellow per the pricing tier hue. */}
				<div className="bg-brand-yellow border-brand-dark flex flex-col gap-4 rounded-2xl border p-5">
					<div className="flex items-baseline justify-between">
						<span className="text-brand-dark text-lg font-bold">
							{nextTier.name}
						</span>
						<span className="text-brand-dark text-2xl font-bold">
							${nextTier.chargeUsd}
							<span className="text-brand-dark/70 text-sm font-normal">/mo</span>
						</span>
					</div>

					<div className="bg-brand-dark/15 h-px" />

					<ul className="flex flex-col gap-2.5">
						{perks.map(perk => (
							<PerkRow key={perk.text} perk={perk} />
						))}
					</ul>
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
						Pay the normal price this time
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface PerkRowProps {
	readonly perk: PlanPerk;
}

/** One perk line — a check, the copy, and an optional highlight chip. */
function PerkRow({ perk }: PerkRowProps) {
	return (
		<li className="text-brand-dark flex items-center gap-2 text-sm font-medium">
			<Check className="size-4 shrink-0" aria-hidden />
			<span>{perk.text}</span>
			{perk.tag !== null ? (
				<span className="bg-brand-dark text-brand-yellow rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide uppercase">
					{perk.tag}
				</span>
			) : null}
		</li>
	);
}
