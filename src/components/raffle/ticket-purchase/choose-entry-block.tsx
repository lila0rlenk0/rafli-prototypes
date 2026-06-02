'use client';

import {
	ArrowDownIcon,
	ArrowLeftIcon,
	ArrowUpIcon,
	CheckIcon,
	MinusIcon,
	PlusIcon,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

import {
	BuyEntriesPanel,
	DEFAULT_ENTRY_QUANTITY,
} from '@/components/raffle/ticket-purchase/buy-entries-panel';
import { SubscriberEntry } from '@/components/raffle/ticket-purchase/subscriber-entry';
import {
	SUBSCRIBE_PLAN_SLUGS,
	SUBSCRIBE_PLANS,
	type SubscribePlan,
	type SubscribePlanSlug,
} from '@/components/subscribe/plans';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';
import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';
import { formatCurrency } from '@/lib/utils/format/format-currency';

interface ChooseEntryBlockProps {
	/** ISO end date — drives the countdown pill + "remaining" stat. */
	readonly endAt: string;
	/** Entries sold so far (raffle.ticketsSoldCount) — the odds denominator. */
	readonly entriesCount: number;
	/** Per-entry price (full retail; subscriber/plan discount applied locally). */
	readonly price: number;
	/** ISO currency code for the per-entry price. */
	readonly currency: string;
	/** Whether the viewer already has benefit-granting subscription. */
	readonly isSubscriber: boolean;
	/**
	 * Whether that subscription is in `past_due` dunning — swaps the green
	 * subscriber banner for a red "renew" notice. Only meaningful when
	 * `isSubscriber` is true.
	 */
	readonly isPastDue: boolean;
	/** Active plan name when subscribed — drives the subscriber banner copy. */
	readonly subscriptionPlanName: string | null;
	/** Active discount percent when subscribed. */
	readonly subscriptionDiscountPercent: number;
	/** Raw credit balance string from `/me/credits` — drives the subscriber credits flow. */
	readonly availableCredits: string | null;
	/** Sweepstakes name forwarded to the buy-entries Access Pass disclosure. */
	readonly sweepstakesName: string;
	/** Public slug — forwarded to the subscriber confirmation share link. */
	readonly publicSlug: string;
}

const STARTER = SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.STARTER];
const PRO = SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.PRO];
const BASIC = SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.BASIC];

/**
 * The three concise feature lines a full plan card renders. Derived from the
 * plan config so prices/discounts stay truthful to the backend contract.
 *
 * @param plan - The plan to describe
 * @returns Up to three short feature strings
 */
function planFeatures(plan: SubscribePlan): readonly string[] {
	return [
		`${plan.savingsPercent}% off entries`,
		plan.weeklyFreeEntries > 0
			? `${plan.weeklyFreeEntries} free entries / week`
			: 'Credits roll into the monthly pool',
		'Content library 10k+',
	];
}

/** Zero-pads a countdown unit to two digits. */
function pad(value: number): string {
	return String(value).padStart(2, '0');
}

interface CountdownInput {
	readonly isHydrated: boolean;
	readonly isExpired: boolean;
	readonly days: number;
	readonly hours: number;
	readonly minutes: number;
	readonly seconds: number;
}

/**
 * Builds the countdown label, or an em-dash before hydration / once expired.
 *
 * @param window - Hydration + expiry flags and the remaining d/h/m/s
 * @returns The formatted countdown string
 */
function formatCountdownLabel({
	isHydrated,
	isExpired,
	days,
	hours,
	minutes,
	seconds,
}: CountdownInput): string {
	if (!isHydrated || isExpired) return '—';
	return `${pad(days)}d : ${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}

/**
 * Redesigned "Choose how to enter" block for an active (live) raffle. A
 * sweepstakes header ("Enter to Win" + title), black-bordered display-font
 * countdown, and the per-entry + live-odds blocks sit above the subscription
 * plan picker; selecting a plan previews its discount on the per-entry price (no
 * navigation). Guests reveal the redesigned `BuyEntriesPanel` via the one-time
 * purchase toggle; subscribers see it always-present under "Select amount of
 * entries". The selected quantity is owned here so the odds block (with a
 * green-up / red-down trend arrow) stays in sync, and each change fires a
 * fleeting encouragement popup anchored outside the block. Subscribers also see
 * a benefit banner instead of the picker.
 *
 * @param props - Raffle stats and subscription context
 * @returns The active-raffle entry block
 */
export function ChooseEntryBlock({
	endAt,
	entriesCount,
	price,
	currency,
	isSubscriber,
	isPastDue,
	subscriptionPlanName,
	subscriptionDiscountPercent,
	availableCredits,
	sweepstakesName,
	publicSlug,
}: ChooseEntryBlockProps) {
	const { isHydrated, days, hours, minutes, seconds, isExpired } =
		useRaffleSaleWindow(endAt);
	// Plan previewed in the picker (guests only) — drives the discounted
	// per-entry price and the buy panel's discount copy without navigating away.
	const [selectedPlanSlug, setSelectedPlanSlug] =
		useState<SubscribePlanSlug | null>(null);
	// Owned here (not in the buy panel) so the odds block at the top recomputes
	// from the same quantity the buy panel's chips/stepper change.
	const [quantity, setQuantity] = useState<number>(DEFAULT_ENTRY_QUANTITY);
	// Direction of the last quantity change — drives the up/down arrow next to
	// the odds. Null until the user first changes the amount.
	const [oddsTrend, setOddsTrend] = useState<OddsTrend>(null);
	// Transient encouragement that pops out beside the block on each quantity
	// change, then clears itself — never a permanent label inside the block.
	const [encouragement, setEncouragement] = useState<EncouragementPopup | null>(
		null,
	);

	// Wrap the setter so a change from the chips/stepper records whether the
	// odds just improved (more entries) or worsened (fewer) for the arrow, and
	// fires the fleeting encouragement popup for the new amount.
	function handleQuantityChange(next: number) {
		if (next > quantity) setOddsTrend('up');
		else if (next < quantity) setOddsTrend('down');
		setQuantity(next);
		// id bumps every change so a same-tier message still replays the popup
		// animation and resets its auto-dismiss timer.
		setEncouragement(prev => ({
			id: (prev?.id ?? 0) + 1,
			message: encouragementFor(next),
		}));
	}

	const encouragementId = encouragement?.id;
	useEffect(() => {
		if (encouragementId === undefined) return;
		// auto-dismiss: the popup is a fleeting nudge, gone after a couple seconds.
		const timer = setTimeout(
			() => setEncouragement(null),
			ENCOURAGEMENT_VISIBLE_MS,
		);
		return () => clearTimeout(timer);
	}, [encouragementId]);

	const selectedPlan = selectedPlanSlug
		? SUBSCRIBE_PLANS[selectedPlanSlug]
		: null;
	// Subscribers get their real discount; guests preview the selected plan's.
	const discountPercent = isSubscriber
		? subscriptionDiscountPercent
		: (selectedPlan?.savingsPercent ?? 0);
	const planName = isSubscriber
		? subscriptionPlanName
		: (selectedPlan?.name ?? null);
	const hasDiscount = discountPercent > 0;
	const effectiveUnitPrice = price * ((100 - discountPercent) / 100);
	// Subscribers get a plan-tinted per-entry block (Pro yellow / Starter sky /
	// Basic dark); guests keep the neutral bordered block.
	const perEntryAccent = isSubscriber ? subscriberPlanAccent(planName) : null;

	const countdownLabel = formatCountdownLabel({
		isHydrated,
		isExpired,
		days,
		hours,
		minutes,
		seconds,
	});

	// The guest one-time panel — discount previewed from the selected plan.
	// Subscribers use their own credits/cash panels inside SubscriberEntry.
	const guestBuyPanel = (
		<BuyEntriesPanel
			price={price}
			currency={currency}
			discountPercent={discountPercent}
			planName={planName}
			isSubscriber={isSubscriber}
			sweepstakesName={sweepstakesName}
			quantity={quantity}
			onQuantityChange={handleQuantityChange}
		/>
	);

	return (
		<div className="border-border bg-card relative flex h-fit flex-col gap-5 rounded-3xl border p-6">
			{/* Fleeting encouragement — anchored outside the block, never inside;
			    keyed by id so each quantity change replays the pop. */}
			{encouragement ? (
				<EncouragementPopup
					key={encouragement.id}
					message={encouragement.message}
				/>
			) : null}

			{/* Sweepstakes header — "Enter to Win" caption, then the title */}
			<div className="flex flex-col gap-0.5">
				<p className="text-muted-foreground text-xs">Enter to Win</p>
				<p className="text-base font-semibold">{sweepstakesName}</p>
			</div>

			{/* Live countdown — display font, oversized, black-bordered, pulsing */}
			<p className="bg-brand-yellow border-brand-dark text-brand-dark font-clash-display rounded-full border py-4 text-center text-3xl font-semibold tabular-nums motion-safe:animate-pulse">
				{countdownLabel}
			</p>

			{/* Per entry + My odds — separate, enlarged blocks */}
			<div className="grid grid-cols-2 gap-2">
				<PerEntryStat
					price={price}
					effectiveUnitPrice={effectiveUnitPrice}
					currency={currency}
					hasDiscount={hasDiscount}
					accent={perEntryAccent}
				/>
				<MyOddsStat
					quantity={quantity}
					entriesCount={entriesCount}
					trend={oddsTrend}
				/>
			</div>

			{/* The lower half differs by viewer: subscribers get the credits-aware
			    checkout (State A/B + past-due) owned by SubscriberEntry; guests get
			    the plan picker with a one-time-purchase escape hatch. */}
			{isSubscriber ? (
				<SubscriberEntry
					price={price}
					currency={currency}
					planName={subscriptionPlanName}
					discountPercent={subscriptionDiscountPercent}
					isPastDue={isPastDue}
					availableCredits={availableCredits}
					quantity={quantity}
					onQuantityChange={handleQuantityChange}
					sweepstakesName={sweepstakesName}
					publicSlug={publicSlug}
				/>
			) : (
				<GuestEntry
					selectedPlanSlug={selectedPlanSlug}
					onSelectPlan={setSelectedPlanSlug}
					quantity={quantity}
					buyPanel={guestBuyPanel}
				/>
			)}
		</div>
	);
}

interface GuestEntryProps {
	readonly selectedPlanSlug: SubscribePlanSlug | null;
	readonly onSelectPlan: (slug: SubscribePlanSlug) => void;
	readonly quantity: number;
	readonly buyPanel: ReactNode;
}

/**
 * Guest lower half — the subscription plan picker (with a "Subscribe & enter"
 * CTA once a plan is chosen) and a one-time-purchase toggle. Opening one-time
 * swaps in the buy panel while keeping a "back to subscription plans" link, so
 * the guest is always one tap from the plans. The open/closed flag lives here
 * because nothing above this section depends on it.
 *
 * @param props - Selected plan, selection handler, quantity, and buy panel
 * @returns The guest entry section
 */
function GuestEntry({
	selectedPlanSlug,
	onSelectPlan,
	quantity,
	buyPanel,
}: GuestEntryProps) {
	const [oneTimeOpen, setOneTimeOpen] = useState(false);

	if (oneTimeOpen) {
		return (
			<>
				<OneTimeToggle
					open
					quantity={quantity}
					onToggle={() => setOneTimeOpen(false)}
				/>
				{buyPanel}
				<button
					type="button"
					onClick={() => setOneTimeOpen(false)}
					className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-sm font-medium transition-colors duration-150"
				>
					<ArrowLeftIcon className="size-4" />
					Back to subscription plans
				</button>
			</>
		);
	}

	return (
		<>
			<PlanPicker selectedSlug={selectedPlanSlug} onSelect={onSelectPlan} />
			{selectedPlanSlug !== null ? (
				<Button asChild size="lg" className="w-full">
					<Link href="/pricing">Subscribe &amp; enter</Link>
				</Button>
			) : null}
			<OneTimeToggle
				open={false}
				quantity={quantity}
				onToggle={() => setOneTimeOpen(true)}
			/>
		</>
	);
}

interface OneTimeToggleProps {
	readonly open: boolean;
	readonly quantity: number;
	readonly onToggle: () => void;
}

/**
 * One-time purchase toggle row — carries the selected entry count as a pill so
 * it stays visible when the buy panel is collapsed, and flips its +/− glyph
 * with the open state.
 *
 * @param props - Open state, current quantity, and the toggle handler
 * @returns The toggle button
 */
function OneTimeToggle({ open, quantity, onToggle }: OneTimeToggleProps) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={open}
			className="border-border hover:bg-muted/50 flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-colors duration-150"
		>
			<span className="flex items-center gap-2">
				<span className="text-base font-medium">One-time purchase</span>
				<span className="bg-brand-dark rounded-full px-2.5 py-1 text-sm font-semibold text-white tabular-nums">
					{quantity} entries
				</span>
			</span>
			{open ? (
				<MinusIcon className="text-muted-foreground size-5" />
			) : (
				<PlusIcon className="text-muted-foreground size-5" />
			)}
		</button>
	);
}

/** How long the encouragement popup stays before it auto-dismisses (ms). */
const ENCOURAGEMENT_VISIBLE_MS = 2_000;

/** Transient encouragement shown beside the block on a quantity change. */
interface EncouragementPopup {
	readonly id: number;
	readonly message: string;
}

interface OddsInput {
	readonly quantity: number;
	readonly entriesCount: number;
}

/**
 * Win odds for holding `quantity` entries against the entries already sold.
 * Reads as a percentage when meaningful, switching to "1 in N" below 1% where
 * a tiny percent would be unreadable.
 *
 * @param input - Selected quantity and entries already sold
 * @returns A human-readable odds string
 */
function formatOdds({ quantity, entriesCount }: OddsInput): string {
	const total = entriesCount + quantity;
	if (total <= 0) return '—';
	const fraction = quantity / total;
	const percent = fraction * 100;
	if (percent >= 1) return `${percent.toFixed(1)}%`;
	return `1 in ${Math.round(1 / fraction).toLocaleString('en-US')}`;
}

/** Direction of the most recent quantity change (null before the first change). */
type OddsTrend = 'up' | 'down' | null;

// Encouragement copy keyed by an entry-count floor, checked high-to-low so the
// first match wins. The tail entry (threshold 0) is the guaranteed fallback, so
// every quantity resolves to a message. Picked by `encouragementFor`.
const ENCOURAGEMENTS: readonly {
	readonly threshold: number;
	readonly message: string;
}[] = [
	{
		threshold: 100,
		message: 'Massive odds — you’ve got serious chances now! 🔥',
	},
	{ threshold: 50, message: 'Now we’re talking — these are great odds! 🚀' },
	{
		threshold: 25,
		message: 'Nice — your odds are climbing fast. Keep going! 📈',
	},
	{ threshold: 10, message: 'Looking good — more entries, better chances. 👀' },
	{ threshold: 0, message: 'Every entry counts — you’re in the running.' },
];

/**
 * Picks the encouragement message for the current entry count — the first tier
 * whose threshold the quantity clears.
 *
 * @param quantity - Currently selected entry quantity
 * @returns The matching encouragement message
 */
function encouragementFor(quantity: number): string {
	const tier = ENCOURAGEMENTS.find(entry => quantity >= entry.threshold);
	return tier
		? tier.message
		: ENCOURAGEMENTS[ENCOURAGEMENTS.length - 1].message;
}

interface EncouragementPopupProps {
	readonly message: string;
}

/**
 * Fleeting encouragement that pops out just above the entry block on each
 * quantity change, then auto-dismisses — clash-display copy on a yellow pill
 * with a black border, anchored outside the block (never inside it). The parent
 * keys it by id so consecutive changes replay the pop.
 */
function EncouragementPopup({ message }: EncouragementPopupProps) {
	return (
		<p
			role="status"
			className="bg-brand-yellow border-brand-dark text-brand-dark font-clash-display motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 absolute bottom-full left-1/2 z-(--z-sticky) mb-2 -translate-x-1/2 rounded-full border px-4 py-2 text-center text-base font-semibold whitespace-nowrap duration-200"
		>
			{message}
		</p>
	);
}

/**
 * Color treatment for a subscriber's per-entry block, keyed to the plan tier:
 * Pro → yellow, Starter → sky blue, Basic → dark. `box` fills the block, `text`
 * is the price, `muted` is the caption + struck-through retail.
 */
interface PlanAccent {
	readonly box: string;
	readonly text: string;
	readonly muted: string;
}

/**
 * Maps an active subscription's plan name to its per-entry block accent. Matches
 * on the tier word so it survives backend name variants ("Pro Access Pass").
 *
 * @param planName - The subscriber's active plan name, if any
 * @returns The accent classes for that tier, or null when no tier matches
 */
function subscriberPlanAccent(planName: string | null): PlanAccent | null {
	if (planName === null) return null;
	const normalized = planName.toLowerCase();
	if (normalized.includes('pro')) {
		return {
			box: 'bg-brand-yellow border-transparent',
			text: 'text-brand-dark',
			muted: 'text-brand-dark/60',
		};
	}
	if (normalized.includes('starter')) {
		return {
			box: 'bg-brand-sky border-transparent',
			text: 'text-brand-dark',
			muted: 'text-brand-dark/60',
		};
	}
	if (normalized.includes('basic')) {
		return {
			box: 'bg-brand-dark border-transparent',
			text: 'text-white',
			muted: 'text-white/70',
		};
	}
	return null;
}

interface PerEntryStatProps {
	readonly price: number;
	readonly effectiveUnitPrice: number;
	readonly currency: string;
	readonly hasDiscount: boolean;
	/** Plan-tinted treatment for subscribers; null keeps the neutral block. */
	readonly accent: PlanAccent | null;
}

/**
 * Per-entry block — the discounted price (with retail struck through when a plan
 * is selected) in the display font, kept compact enough to stay on one line.
 * Subscribers get a plan-tinted fill; guests keep the neutral bordered block.
 */
function PerEntryStat({
	price,
	effectiveUnitPrice,
	currency,
	hasDiscount,
	accent,
}: PerEntryStatProps) {
	const captionClass = accent ? accent.muted : 'text-muted-foreground';
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center gap-1 rounded-2xl border p-5 text-center',
				accent ? accent.box : 'border-border',
			)}
		>
			<p
				className={cn(
					'text-xs font-semibold tracking-wide uppercase',
					captionClass,
				)}
			>
				Per entry
			</p>
			{hasDiscount ? (
				<p className="flex flex-col items-center">
					<span className={cn('text-sm line-through', captionClass)}>
						{formatCurrency(price, currency)}
					</span>
					{/* Discounted price is the headline number when a subscription
					    discount applies — sized up a step from the plain price. */}
					<span
						className={cn(
							'font-clash-display text-3xl font-semibold whitespace-nowrap tabular-nums',
							accent ? accent.text : 'text-green-forest',
						)}
					>
						{formatCurrency(effectiveUnitPrice, currency)}
					</span>
				</p>
			) : (
				<p
					className={cn(
						'font-clash-display text-xl font-semibold whitespace-nowrap tabular-nums',
						accent ? accent.text : '',
					)}
				>
					{formatCurrency(price, currency)}
				</p>
			)}
		</div>
	);
}

interface MyOddsStatProps {
	readonly quantity: number;
	readonly entriesCount: number;
	readonly trend: OddsTrend;
}

/**
 * Enlarged win-odds block — recomputes live as the buy panel's quantity
 * changes, with a caption naming the quantity it reflects. A green up arrow
 * (more entries → better odds) or red down arrow (fewer) flags the last change.
 */
function MyOddsStat({ quantity, entriesCount, trend }: MyOddsStatProps) {
	const odds = formatOdds({ quantity, entriesCount });
	return (
		<div className="border-border flex flex-col items-center justify-center gap-1 rounded-2xl border p-5 text-center">
			<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
				My odds
			</p>
			<p className="font-clash-display flex items-center justify-center gap-1 text-xl font-semibold whitespace-nowrap tabular-nums">
				{odds}
				<OddsTrendArrow trend={trend} />
			</p>
			<p className="text-muted-foreground text-xs">with {quantity} entries</p>
		</div>
	);
}

interface OddsTrendArrowProps {
	readonly trend: OddsTrend;
}

/** Colored direction arrow beside the odds — green up / red down, none at rest. */
function OddsTrendArrow({ trend }: OddsTrendArrowProps) {
	if (trend === 'up') {
		return (
			<ArrowUpIcon
				className="text-green-forest size-4"
				aria-label="odds improved"
			/>
		);
	}
	if (trend === 'down') {
		return (
			<ArrowDownIcon
				className="size-4 text-red-500"
				aria-label="odds lowered"
			/>
		);
	}
	return null;
}

interface PlanPickerProps {
	readonly selectedSlug: SubscribePlanSlug | null;
	readonly onSelect: (slug: SubscribePlanSlug) => void;
}

/** Subscription plan picker — Starter + Pro feature cards, Basic compact row. */
function PlanPicker({ selectedSlug, onSelect }: PlanPickerProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h2 className="text-xl font-bold">Choose how to enter</h2>
				<p className="text-muted-foreground text-xs">
					Subscribers get free weekly entries, discounted entries, and 100%
					credit back
				</p>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<PlanCard
					plan={STARTER}
					isSelected={selectedSlug === STARTER.slug}
					onSelect={onSelect}
				/>
				<PlanCard
					plan={PRO}
					highlighted
					isSelected={selectedSlug === PRO.slug}
					onSelect={onSelect}
				/>
			</div>

			<BasicRow isSelected={selectedSlug === BASIC.slug} onSelect={onSelect} />
		</div>
	);
}

interface SelectableBorderInput {
	readonly isSelected: boolean;
	readonly highlighted: boolean;
}

/**
 * Border class for a selectable plan card — a single black border when chosen
 * (no ring, so there's no double-border halo), else the card's resting border.
 *
 * @param input - Selection + highlight state
 * @returns The border utility class for the card
 */
function selectableBorderClass({
	isSelected,
	highlighted,
}: SelectableBorderInput): string {
	if (isSelected) return 'border-brand-dark';
	return highlighted ? 'border-transparent' : 'border-border';
}

interface PlanCardProps {
	readonly plan: SubscribePlan;
	readonly highlighted?: boolean;
	readonly isSelected: boolean;
	readonly onSelect: (slug: SubscribePlanSlug) => void;
}

/** A selectable plan card (Starter / Pro) — price, features, selection state. */
function PlanCard({
	plan,
	highlighted = false,
	isSelected,
	onSelect,
}: PlanCardProps) {
	return (
		<button
			type="button"
			aria-pressed={isSelected}
			onClick={() => onSelect(plan.slug)}
			className={cn(
				'relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-colors duration-150',
				highlighted ? 'bg-brand-yellow' : '',
				selectableBorderClass({ isSelected, highlighted }),
			)}
		>
			{highlighted ? (
				<span className="bg-brand-dark text-brand-yellow absolute -top-2 right-4 rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide">
					BEST VALUE
				</span>
			) : null}

			<p
				className={cn(
					'text-xs font-semibold tracking-wide uppercase',
					highlighted ? 'text-brand-dark' : 'text-muted-foreground',
				)}
			>
				{plan.name}
			</p>

			<p className="flex items-baseline gap-1">
				<span className="text-3xl font-bold">${plan.chargeUsd}</span>
				<span
					className={cn(
						'text-xs',
						highlighted ? 'text-brand-dark/70' : 'text-muted-foreground',
					)}
				>
					/mo
				</span>
			</p>

			<div
				className={cn('h-px', highlighted ? 'bg-brand-dark/15' : 'bg-border')}
			/>

			<ul className="flex flex-col gap-1.5">
				{planFeatures(plan).map(feature => (
					<li
						key={feature}
						className={cn(
							'text-xs',
							highlighted ? 'text-brand-dark' : 'text-muted-foreground',
						)}
					>
						{feature}
					</li>
				))}
			</ul>

			<SelectionPill isSelected={isSelected} />
		</button>
	);
}

interface SelectionPillProps {
	readonly isSelected: boolean;
}

/** Footer affordance on a plan card — flips to a confirmed state when chosen. */
function SelectionPill({ isSelected }: SelectionPillProps) {
	return (
		<span
			className={cn(
				'mt-auto flex items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-semibold',
				isSelected ? 'bg-brand-dark text-white' : 'border-border border',
			)}
		>
			{isSelected ? (
				<>
					<CheckIcon className="size-4" />
					Selected
				</>
			) : (
				'Select'
			)}
		</span>
	);
}

interface BasicRowProps {
	readonly isSelected: boolean;
	readonly onSelect: (slug: SubscribePlanSlug) => void;
}

/** Compact full-width Basic plan row — name + price + selection state. */
function BasicRow({ isSelected, onSelect }: BasicRowProps) {
	return (
		<button
			type="button"
			aria-pressed={isSelected}
			onClick={() => onSelect(BASIC.slug)}
			className={cn(
				'flex items-center justify-between rounded-2xl border p-4 text-left transition-colors duration-150',
				isSelected ? 'border-brand-dark' : 'border-border',
			)}
		>
			<div className="flex flex-col">
				<span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
					{BASIC.name}
				</span>
				<p className="flex items-baseline gap-1">
					<span className="text-2xl font-bold">${BASIC.chargeUsd}</span>
					<span className="text-muted-foreground text-xs">/mo</span>
				</p>
			</div>
			<SelectionPill isSelected={isSelected} />
		</button>
	);
}
