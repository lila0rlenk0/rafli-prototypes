import { Check, ChevronRight, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import {
	GUEST_COPY,
	HUB_PLAN,
	type HubMode,
	PLAN_CHOICES,
	type PlanChoice,
	type PlanConfig,
	type PlanTier,
} from './hub-content';

/** Tier → badge tint. */
const BADGE_TONE: Record<PlanTier, string> = {
	none: 'bg-black/5 text-ink-700',
	basic: 'bg-brand-sky text-ink-900',
	starter: 'bg-brand-mint text-ink-900',
	pro: 'bg-brand-dark text-white',
};

/** Full tier presets covering the four Figma plan-card states. */
const PLAN_PRESETS: Record<PlanTier, PlanConfig> = {
	none: {
		tier: 'none',
		eyebrow: 'NO MEMBERSHIP',
		badge: 'FREE',
		price: 'No plan',
		description: 'Start a plan to unlock games, credits, and perks.',
		benefits: [
			'Browse every sweepstake',
			'No monthly credits',
			'No member discount',
			'Daily games locked',
		],
		primaryCta: 'Start membership',
		secondaryCta: 'Compare tiers',
	},
	basic: {
		tier: 'basic',
		eyebrow: 'YOU’RE ON BASIC',
		badge: 'BASIC',
		price: '$4.99 / month',
		description: 'A light touch of perks. Renews Jun 12.',
		benefits: [
			'5 credits every month',
			'10% off every entry',
			'1 daily game unlocked',
			'Standard support',
		],
		primaryCta: 'Manage',
		secondaryCta: 'Upgrade',
	},
	starter: {
		tier: 'starter',
		eyebrow: 'YOU’RE ON STARTER',
		badge: 'STARTER',
		price: '$6.99 / month',
		description: 'More games, more savings. Renews Jun 12.',
		benefits: [
			'8 credits every month',
			'12% off every entry',
			'2 daily games unlocked',
			'Priority support',
		],
		primaryCta: 'Manage',
		secondaryCta: 'Upgrade to PRO',
	},
	pro: HUB_PLAN,
};

/**
 * One selectable tier row in the guest "Choose a plan" card.
 *
 * @param choice - Tier option (label, price, blurb, recommended flag)
 * @returns A pick-a-plan row
 */
function PlanChoiceRow({ choice }: { readonly choice: PlanChoice }) {
	return (
		<li
			className={cn(
				'flex items-center gap-3 rounded-xl border p-3',
				choice.recommended
					? 'border-ink-900 bg-brand-yellow/30'
					: 'border-black/10',
			)}
		>
			<span
				className={cn(
					'rounded-full px-2.5 py-1 text-xs font-bold tracking-wide',
					BADGE_TONE[choice.tier],
				)}
			>
				{choice.label}
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-ink-900 text-body-sm font-semibold">
					{choice.price}
				</p>
				<p className="text-ink-500 truncate text-xs">{choice.blurb}</p>
			</div>
			{choice.recommended ? (
				<span className="bg-brand-dark shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-white">
					Popular
				</span>
			) : null}
			<ChevronRight className="text-ink-400 size-4 shrink-0" />
		</li>
	);
}

/**
 * Logged-out "Choose a plan" card — lists the three tiers with prices and a
 * Subscribe / Log in action pair.
 *
 * @returns The guest plan-chooser card
 */
function PlanChooser() {
	return (
		<section
			id="plan"
			className="flex flex-col rounded-2xl border border-black/10 bg-white p-5 sm:p-6"
		>
			<p className="text-ink-500 text-label-sm font-semibold tracking-wider uppercase">
				{GUEST_COPY.planEyebrow}
			</p>
			<h2 className="font-clash-display text-ink-900 mt-1 text-xl font-semibold">
				{GUEST_COPY.planTitle}
			</h2>

			<ul className="mt-4 flex flex-col gap-2">
				{PLAN_CHOICES.map(choice => (
					<PlanChoiceRow key={choice.tier} choice={choice} />
				))}
			</ul>

			<div className="mt-5 flex flex-wrap gap-2">
				<Button size="sm">{GUEST_COPY.subscribe}</Button>
				<Button size="sm" variant="outline">
					{GUEST_COPY.logIn}
				</Button>
			</div>
		</section>
	);
}

interface PlanCardProps {
	/** Subscription tier — defaults to the live hub's PRO plan. */
	readonly tier?: PlanTier;
	/** Audience mode — guest renders the "Choose a plan" chooser instead. */
	readonly mode?: HubMode;
}

/**
 * Subscription status card — tier badge, price, description, a four-row
 * benefit list, and a primary/secondary action pair. The `tier` prop selects
 * one of the four Figma gallery states; the unsubscribed tier shows the
 * benefits as struck-through to read as "not yours yet". In guest mode it
 * renders the "Choose a plan" chooser instead.
 *
 * @param tier - Subscription tier to render
 * @param mode - Audience mode (defaults to subscribed)
 * @returns The plan card
 */
export function PlanCard({ tier = 'pro', mode = 'subscribed' }: PlanCardProps) {
	if (mode === 'guest') {
		return <PlanChooser />;
	}

	const plan = PLAN_PRESETS[tier];
	const isNone = tier === 'none';

	return (
		<section
			id="plan"
			className="flex flex-col rounded-2xl border border-black/10 bg-white p-5 sm:p-6"
		>
			<p className="text-ink-500 text-label-sm font-semibold tracking-wider uppercase">
				{plan.eyebrow}
			</p>

			<div className="mt-2 flex items-center gap-3">
				<span
					className={cn(
						'rounded-full px-2.5 py-1 text-xs font-bold tracking-wide',
						BADGE_TONE[tier],
					)}
				>
					{plan.badge}
				</span>
				<span className="font-clash-display text-ink-900 text-2xl font-semibold">
					{plan.price}
				</span>
			</div>

			<p className="text-ink-600 text-body-sm mt-2">{plan.description}</p>

			<ul className="mt-4 flex flex-col gap-2.5">
				{plan.benefits.map(benefit => (
					<li key={benefit} className="flex items-center gap-2.5">
						<span
							className={cn(
								'flex size-5 shrink-0 items-center justify-center rounded-full',
								isNone ? 'bg-black/5' : 'bg-brand-mint',
							)}
						>
							{isNone ? (
								<X className="text-ink-400 size-3" />
							) : (
								<Check className="text-status-live size-3.5" />
							)}
						</span>
						<span
							className={cn(
								'text-body-sm',
								isNone ? 'text-ink-400 line-through' : 'text-ink-700',
							)}
						>
							{benefit}
						</span>
					</li>
				))}
			</ul>

			<div className="mt-5 flex flex-wrap gap-2">
				<Button size="sm">{plan.primaryCta}</Button>
				<Button size="sm" variant="outline">
					{plan.secondaryCta}
				</Button>
			</div>
		</section>
	);
}
