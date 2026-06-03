import { ChevronRight, Coins, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import {
	GUEST_COPY,
	HUB_CREDITS,
	HUB_PERKS,
	HUB_PLAN,
	type HubMode,
	type Perk,
	type PerkStatus,
	PERKS_HEADER,
	PLAN_CHOICES,
	type PlanChoice,
	type PlanTier,
} from './hub-content';
import { HubIcon } from './hub-icon';

/** Status chip tone keyed by perk status. */
const STATUS_TONE: Record<PerkStatus, string> = {
	active: 'bg-brand-mint text-status-live',
	available: 'bg-brand-yellow text-ink-900',
	refilling: 'bg-black/5 text-ink-500',
};

/** Tier → badge tint, shared by the plan summary + guest chooser. */
const TIER_BADGE: Record<PlanTier, string> = {
	none: 'bg-black/5 text-ink-700',
	basic: 'bg-brand-sky text-ink-900',
	starter: 'bg-brand-mint text-ink-900',
	pro: 'bg-brand-dark text-white',
};

/**
 * Subscribed plan summary — tier badge, monthly price, and the Manage /
 * Compare tiers actions.
 *
 * @returns The plan summary block
 */
function PlanSummary() {
	return (
		<div className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-black/5 p-4">
			<span
				className={cn(
					'rounded-full px-2.5 py-1 text-xs font-bold tracking-wide',
					TIER_BADGE[HUB_PLAN.tier],
				)}
			>
				{HUB_PLAN.badge}
			</span>
			<span className="font-clash-display text-ink-900 text-xl font-semibold">
				{HUB_PLAN.price}
			</span>
			<div className="ml-auto flex gap-2">
				<Button size="sm">{HUB_PLAN.primaryCta}</Button>
				<Button size="sm" variant="outline">
					{HUB_PLAN.secondaryCta}
				</Button>
			</div>
		</div>
	);
}

/**
 * One selectable tier row in the guest chooser.
 *
 * @param choice - Tier option
 * @returns A pick-a-plan row
 */
function GuestPlanRow({ choice }: { readonly choice: PlanChoice }) {
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
					TIER_BADGE[choice.tier],
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
			<ChevronRight className="text-ink-400 size-4 shrink-0" />
		</li>
	);
}

/**
 * Guest plan chooser — the three tiers plus subscribe / log-in actions.
 *
 * @returns The guest plan block
 */
function GuestPlan() {
	return (
		<div className="flex flex-col gap-3">
			<p className="text-ink-500 text-label-sm font-semibold tracking-wider uppercase">
				{GUEST_COPY.planEyebrow}
			</p>
			<ul className="flex flex-col gap-2">
				{PLAN_CHOICES.map(choice => (
					<GuestPlanRow key={choice.tier} choice={choice} />
				))}
			</ul>
			<div className="flex gap-2">
				<Button size="sm">{GUEST_COPY.subscribe}</Button>
				<Button size="sm" variant="outline">
					{GUEST_COPY.logIn}
				</Button>
			</div>
		</div>
	);
}

/**
 * Credits line inside the merged card — a coin badge with the balance, or a
 * locked variant for guests.
 *
 * @param locked - Render the locked (guest) state
 * @returns The credits line
 */
function CreditsLine({ locked }: { readonly locked: boolean }) {
	return (
		<div className="flex items-center gap-3">
			<span
				className={cn(
					'flex size-10 shrink-0 items-center justify-center rounded-full',
					locked ? 'bg-black/5' : 'bg-brand-yellow',
				)}
			>
				{locked ? (
					<Lock className="text-ink-500 size-5" />
				) : (
					<Coins className="text-ink-900 size-5" />
				)}
			</span>
			<div>
				<p className="text-ink-900 text-body-md font-semibold">
					{locked ? 'Credits locked' : HUB_CREDITS.title}
				</p>
				<p className="text-ink-500 text-xs">
					{locked ? 'Subscribe to get 12 monthly' : HUB_CREDITS.worth}
				</p>
			</div>
		</div>
	);
}

interface PerkRowProps {
	readonly perk: Perk;
	/** Guest rows read as locked previews rather than active perks. */
	readonly locked: boolean;
}

/**
 * One perk row — an icon badge, title + description, and a status chip. In the
 * locked (guest) variant the chip becomes a "Locked" tag.
 *
 * @param perk - Perk content + status
 * @param locked - Whether to render the locked preview treatment
 * @returns A single perk row
 */
function PerkRow({ perk, locked }: PerkRowProps) {
	return (
		<li className="flex items-start gap-3 py-3">
			<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/5">
				<HubIcon name={perk.icon} className="text-ink-700 size-4.5" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-ink-900 text-body-sm font-semibold">{perk.title}</p>
				<p className="text-ink-500 text-xs">{perk.description}</p>
			</div>
			{locked ? (
				<span className="text-ink-500 inline-flex shrink-0 items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold">
					<Lock className="size-3" />
					Locked
				</span>
			) : (
				<span
					className={cn(
						'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
						STATUS_TONE[perk.status],
					)}
				>
					{perk.statusLabel}
				</span>
			)}
		</li>
	);
}

interface PerksCardProps {
	/** Audience mode — guest swaps the plan summary for the chooser + locks. */
	readonly mode?: HubMode;
}

/**
 * Plan + credits block — the subscribed tier summary (or the guest chooser)
 * followed by the credit-balance line. Header-less so it drops straight into
 * the merged card on desktop or the "Plan" tab on mobile.
 *
 * @param mode - Audience mode (defaults to subscribed)
 * @returns The plan + credits block
 */
export function PlanBlock({ mode = 'subscribed' }: PerksCardProps) {
	const isGuest = mode === 'guest';
	return (
		<div className="flex flex-col gap-5">
			{isGuest ? <GuestPlan /> : <PlanSummary />}
			<CreditsLine locked={isGuest} />
		</div>
	);
}

/**
 * The perks list — one row per perk, with active chips for subscribers and
 * locked previews for guests. Header-less for the same reuse reason as
 * {@link PlanBlock}.
 *
 * @param mode - Audience mode (defaults to subscribed)
 * @returns The perks list
 */
export function PerksList({ mode = 'subscribed' }: PerksCardProps) {
	const isGuest = mode === 'guest';
	return (
		<ul className="-mt-1 divide-y divide-black/5">
			{HUB_PERKS.map(perk => (
				<PerkRow key={perk.title} perk={perk} locked={isGuest} />
			))}
		</ul>
	);
}

/**
 * Merged "good stuff you unlocked" card — combines the plan summary, the
 * credit balance, and the perks list in one block. Subscribed shows the PRO
 * tier, price, Manage / Compare tiers, the live credit balance, and active
 * perks; guest shows the plan chooser, a locked credit line, and locked perk
 * previews.
 *
 * @param mode - Audience mode (defaults to subscribed)
 * @returns The merged account / perks card
 */
export function PerksCard({ mode = 'subscribed' }: PerksCardProps) {
	const isGuest = mode === 'guest';

	return (
		<section
			id="plan"
			className="flex flex-col gap-5 rounded-2xl border border-black/10 bg-white p-5 sm:p-6"
		>
			<div className="flex flex-col gap-1">
				<h2 className="font-clash-display text-ink-900 text-xl font-semibold">
					{PERKS_HEADER.title}
				</h2>
				<p className="text-ink-500 text-body-sm">
					{isGuest ? GUEST_COPY.perksSubtitle : PERKS_HEADER.subtitle}
				</p>
			</div>

			<PlanBlock mode={mode} />

			<div className="h-px bg-black/10" />

			<PerksList mode={mode} />
		</section>
	);
}
