'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';
import { formatCurrency } from '@/lib/utils/format/format-currency';

// Preset entry counts surfaced as one-tap chips above the stepper; the stepper
// still allows any quantity in between, so these are accelerators, not the only
// options. The first is the default selection (see `DEFAULT_ENTRY_QUANTITY`).
const QUICK_PICKS = [10, 25, 50] as const;

/** Quantity selected on first render — the first quick-pick chip. */
export const DEFAULT_ENTRY_QUANTITY: number = QUICK_PICKS[0];

interface BuyEntriesPanelProps {
	/** Full retail per-entry price in major currency units. */
	readonly price: number;
	/** ISO 4217 currency code for every amount in the panel. */
	readonly currency: string;
	/**
	 * Effective discount percent to preview — the selected plan's savings for a
	 * guest, or the active subscription's discount for a subscriber. 0 hides all
	 * discount affordances.
	 */
	readonly discountPercent: number;
	/** Plan name backing the discount copy ("with your Pro discount"). */
	readonly planName: string | null;
	/**
	 * Whether the discount is actually applied to the charged total (true for an
	 * active subscriber) or only previewed as an upsell (false — total stays full
	 * price, green line reads "When subscribed · save …").
	 */
	readonly isSubscriber: boolean;
	/** Sweepstakes name interpolated into the Access Pass disclosure. */
	readonly sweepstakesName: string;
	/** Selected entry quantity — owned by the parent so the odds block stays in sync. */
	readonly quantity: number;
	/** Raises a new quantity from the chips/stepper up to the parent. */
	readonly onQuantityChange: (quantity: number) => void;
	/**
	 * Tender the order checks out with. `cash` (default) shows currency totals,
	 * the AMOE acknowledgment, and a gated Continue. `credits` reframes the
	 * total + CTA in credits and skips the acknowledgment — a subscriber
	 * spending granted credits has already accepted the terms.
	 */
	readonly tender?: 'cash' | 'credits';
	/**
	 * Whether to render the "More entries…" Access Pass / AMOE disclosure block.
	 * Hidden for subscribers — there's nothing to upsell an already-subscribed
	 * user. Defaults to shown (the guest one-time surface).
	 */
	readonly showDisclosure?: boolean;
	/** Fired when the Continue CTA is pressed. */
	readonly onContinue?: () => void;
	/**
	 * Upper bound on selectable entries. Credits mode passes the balance so the
	 * user can't select more entries than they can fund. Defaults to unbounded.
	 */
	readonly maxQuantity?: number;
}

interface PerEntryCaptionInput {
	readonly isCredits: boolean;
	readonly hasDiscount: boolean;
	readonly planName: string | null;
	readonly effectiveUnitPrice: number;
	readonly price: number;
	readonly currency: string;
}

/**
 * Builds the per-entry caption under the panel heading — "1 credit per entry"
 * in credits mode, the discounted-with-plan line when a discount applies, else
 * the plain retail price.
 *
 * @param input - Tender, discount context, and pricing
 * @returns The caption string
 */
function buildPerEntryCaption({
	isCredits,
	hasDiscount,
	planName,
	effectiveUnitPrice,
	price,
	currency,
}: PerEntryCaptionInput): string {
	if (isCredits) return '1 credit per entry';
	if (hasDiscount && planName !== null) {
		return `${formatCurrency(effectiveUnitPrice, currency)} per entry with your ${planName} discount`;
	}
	return `${formatCurrency(price, currency)} per entry`;
}

/** Pluralises the credits unit for the given count. */
function creditsLabel(quantity: number): string {
	return `${quantity} ${quantity === 1 ? 'credit' : 'credits'}`;
}

/**
 * "Add more entries" panel — the redesigned entry surface from Figma. Quick-pick
 * chips + a quantity stepper drive a live total, checked out with cash (currency
 * total, AMOE acknowledgment, gated Continue) or credits (credits total, no
 * acknowledgment). The Access Pass / AMOE disclosure is optional so subscriber
 * surfaces can drop it.
 *
 * @param props - Pricing, discount, tender, and the sweepstakes name
 * @returns The "add more entries" entry panel
 */
export function BuyEntriesPanel({
	price,
	currency,
	discountPercent,
	planName,
	isSubscriber,
	sweepstakesName,
	quantity,
	onQuantityChange,
	tender = 'cash',
	showDisclosure = true,
	onContinue,
	maxQuantity,
}: BuyEntriesPanelProps) {
	const [isConfirmed, setIsConfirmed] = useState(false);

	const isCredits = tender === 'credits';
	const hasDiscount = discountPercent > 0;
	const effectiveUnitPrice = price * ((100 - discountPercent) / 100);
	// Subscribers pay the discounted unit price; guests see the full charge with
	// the saving dangled as an upsell (the "When subscribed" line below).
	const total = (isSubscriber ? effectiveUnitPrice : price) * quantity;
	const savings = (price - effectiveUnitPrice) * quantity;

	const perEntryCaption = buildPerEntryCaption({
		isCredits,
		hasDiscount,
		planName,
		effectiveUnitPrice,
		price,
		currency,
	});

	// Credits check out 1:1 (1 credit = 1 entry); cash shows the currency total.
	const totalLabel = isCredits
		? creditsLabel(quantity)
		: formatCurrency(total, currency);
	const continueLabel = isCredits
		? `Use ${creditsLabel(quantity)} & enter`
		: 'Continue';
	// Cash gates Continue on the 18+ acknowledgment; credits has no checkbox.
	const isContinueDisabled = isCredits ? false : !isConfirmed;
	// Savings caption is a cash upsell affordance — irrelevant when paying in credits.
	const savingsLabel =
		isCredits || !hasDiscount
			? null
			: buildSavingsLabel({ isSubscriber, savings, currency, planName });

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h2 className="text-lg font-bold">Add more entries</h2>
				<p className="text-muted-foreground text-xs">{perEntryCaption}</p>
			</div>

			<div className="grid grid-cols-3 gap-2">
				{QUICK_PICKS.map(value => (
					<QuickPickChip
						key={value}
						value={value}
						price={price}
						currency={currency}
						isCredits={isCredits}
						isSelected={quantity === value}
						isDisabled={maxQuantity !== undefined && value > maxQuantity}
						onSelect={onQuantityChange}
					/>
				))}
			</div>

			<QuantityStepper
				quantity={quantity}
				maxQuantity={maxQuantity}
				onChange={onQuantityChange}
			/>

			<div className="bg-border h-px" />

			<TotalRow totalLabel={totalLabel} savingsLabel={savingsLabel} />

			{showDisclosure ? <Disclosure sweepstakesName={sweepstakesName} /> : null}

			{isCredits ? null : (
				<ConfirmCheckbox checked={isConfirmed} onChange={setIsConfirmed} />
			)}

			<div className="flex flex-col gap-3">
				<Button
					type="button"
					size="lg"
					disabled={isContinueDisabled}
					onClick={onContinue}
					className="w-full"
				>
					{continueLabel}
				</Button>
				{isCredits ? null : (
					<p className="text-muted-foreground text-center text-xs">
						No purchase necessary. Free entry available — see rules.
					</p>
				)}
			</div>
		</div>
	);
}

interface QuickPickChipProps {
	readonly value: number;
	readonly price: number;
	readonly currency: string;
	readonly isCredits: boolean;
	readonly isSelected: boolean;
	readonly isDisabled: boolean;
	readonly onSelect: (value: number) => void;
}

/** One preset-quantity chip — count, "entries" caption, and its price / credits. */
function QuickPickChip({
	value,
	price,
	currency,
	isCredits,
	isSelected,
	isDisabled,
	onSelect,
}: QuickPickChipProps) {
	const priceLabel = isCredits
		? `${value} ${value === 1 ? 'credit' : 'credits'}`
		: formatCurrency(price * value, currency);
	return (
		<button
			type="button"
			aria-pressed={isSelected}
			disabled={isDisabled}
			onClick={() => onSelect(value)}
			className={cn(
				'flex h-20 flex-col items-center justify-center rounded-xl border text-center transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
				isSelected
					? 'bg-brand-sky border-brand-dark border-2'
					: 'border-border hover:bg-muted/50',
			)}
		>
			<span className="text-2xl font-bold tabular-nums">{value}</span>
			<span className="text-muted-foreground text-xs">
				{value === 1 ? 'entry' : 'entries'}
			</span>
			<span className="text-xs font-semibold">{priceLabel}</span>
		</button>
	);
}

interface QuantityStepperProps {
	readonly quantity: number;
	readonly maxQuantity?: number;
	readonly onChange: (quantity: number) => void;
}

/** Decrement / count / increment row — floor of one entry, optional ceiling. */
function QuantityStepper({
	quantity,
	maxQuantity,
	onChange,
}: QuantityStepperProps) {
	const isAtMax = maxQuantity !== undefined && quantity >= maxQuantity;
	function handleDecrement() {
		onChange(Math.max(1, quantity - 1));
	}
	function handleIncrement() {
		const next = quantity + 1;
		onChange(maxQuantity !== undefined ? Math.min(maxQuantity, next) : next);
	}
	return (
		<div className="border-border flex items-center justify-between rounded-2xl border p-2">
			<button
				type="button"
				aria-label="Remove one entry"
				disabled={quantity <= 1}
				onClick={handleDecrement}
				className="bg-muted flex size-9 items-center justify-center rounded-xl text-lg font-bold disabled:opacity-40"
			>
				−
			</button>
			<span className="text-base font-bold tabular-nums">
				{quantity} {quantity === 1 ? 'entry' : 'entries'}
			</span>
			<button
				type="button"
				aria-label="Add one entry"
				disabled={isAtMax}
				onClick={handleIncrement}
				className="bg-brand-dark flex size-9 items-center justify-center rounded-xl text-lg font-bold text-white disabled:opacity-40"
			>
				+
			</button>
		</div>
	);
}

interface TotalRowProps {
	readonly totalLabel: string;
	readonly savingsLabel: string | null;
}

/** Total amount plus the optional discount note (cash upsell only). */
function TotalRow({ totalLabel, savingsLabel }: TotalRowProps) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between">
				<span className="text-muted-foreground text-sm font-medium">Total</span>
				<span className="text-lg font-bold tabular-nums">{totalLabel}</span>
			</div>
			{savingsLabel !== null ? (
				<p className="text-green-forest text-right text-xs">{savingsLabel}</p>
			) : null}
		</div>
	);
}

interface SavingsLabelInput {
	readonly isSubscriber: boolean;
	readonly savings: number;
	readonly currency: string;
	readonly planName: string | null;
}

/**
 * Builds the green savings caption — an applied-discount confirmation for
 * subscribers, an upsell preview for guests. Returns null when there's no plan
 * to attribute the saving to.
 *
 * @param input - Subscriber flag, saving amount, currency, and plan name
 * @returns The savings caption, or null when no plan backs the saving
 */
function buildSavingsLabel({
	isSubscriber,
	savings,
	currency,
	planName,
}: SavingsLabelInput): string | null {
	if (planName === null) return null;
	const amount = formatCurrency(savings, currency);
	return isSubscriber
		? `${planName} discount applied · you save ${amount}`
		: `(When subscribed · save ${amount} with ${planName})`;
}

interface DisclosureProps {
	readonly sweepstakesName: string;
}

/** Access Pass + AMOE legal copy shown above the acknowledgment. */
function Disclosure({ sweepstakesName }: DisclosureProps) {
	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm font-semibold">
				More entries, better chances of winning.
			</p>
			<div className="text-muted-foreground flex flex-col gap-2 text-xs/relaxed">
				<p>
					Your purchase is an Access Pass for the following sweepstakes:{' '}
					{sweepstakesName}. It unlocks exclusive content and opportunities —
					1-month FREE access to a 10k+ content library with online tips &amp;
					tricks, host updates, behind-the-scenes posts, early notifications,
					entry history, payment receipt, and bonus entries into the draw.
				</p>
				<p>
					Every entry — paid or free — carries identical odds. Check{' '}
					<Link href="/free-entry" className="underline">
						/free-entry
					</Link>{' '}
					to understand how our Alternative Method of Entry works. Void where
					prohibited. See Terms.
				</p>
			</div>
		</div>
	);
}

interface ConfirmCheckboxProps {
	readonly checked: boolean;
	readonly onChange: (checked: boolean) => void;
}

/** Required 18+ / AMOE acknowledgment gating the Continue CTA. */
function ConfirmCheckbox({ checked, onChange }: ConfirmCheckboxProps) {
	const checkboxId = useId();
	return (
		<div className="flex items-start gap-3">
			<input
				id={checkboxId}
				type="checkbox"
				checked={checked}
				onChange={event => onChange(event.target.checked)}
				className="border-border mt-0.5 size-4 shrink-0 cursor-pointer rounded"
			/>
			<label
				htmlFor={checkboxId}
				className="text-muted-foreground cursor-pointer text-xs/relaxed"
			>
				I confirm I&apos;m 18+ and agree to the{' '}
				<Link href="/terms" className="underline">
					Terms
				</Link>
				. I understand no purchase is necessary to enter or win — a free entry
				with identical odds is available at{' '}
				<Link href="/free-entry" className="underline">
					/free-entry
				</Link>
				.
			</label>
		</div>
	);
}
