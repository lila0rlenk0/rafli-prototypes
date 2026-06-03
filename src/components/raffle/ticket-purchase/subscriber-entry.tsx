'use client';

import {
	Bitcoin,
	Coins,
	CreditCard,
	InfoIcon,
	Sparkles,
	Star,
	TriangleAlertIcon,
} from 'lucide-react';
import Link from 'next/link';
import { type ComponentType, useState } from 'react';

import { useOpenBillingPortal } from '@/components/pricing/subscribe/use-open-billing-portal';
import { BuyEntriesPanel } from '@/components/raffle/ticket-purchase/buy-entries-panel';
import { EntriesConfirmedModal } from '@/components/raffle/ticket-purchase/entries-confirmed-modal';
import {
	getNextTierUp,
	OutOfCreditsModal,
} from '@/components/raffle/ticket-purchase/out-of-credits-modal';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/class-names';

interface SubscriberEntryProps {
	/** Full retail per-entry price in major currency units. */
	readonly price: number;
	/** ISO 4217 currency code. */
	readonly currency: string;
	/** Active plan name — drives the banner, star glyph, and upsell target. */
	readonly planName: string | null;
	/** Applied subscriber discount percent (for the credits-mode panel preview). */
	readonly discountPercent: number;
	/** Whether the subscription is in past-due dunning. */
	readonly isPastDue: boolean;
	/** Raw credit balance string from `/me/credits` (1 credit = $1 = 1 entry). */
	readonly availableCredits: string | null;
	/** Selected entry quantity — owned by the parent so the odds block stays in sync. */
	readonly quantity: number;
	/** Raises a new quantity up to the parent. */
	readonly onQuantityChange: (quantity: number) => void;
	/** Sweepstakes name for the confirmation share copy. */
	readonly sweepstakesName: string;
	/** Public slug for the confirmation share link. */
	readonly publicSlug: string;
}

/**
 * Parses the raw credit-balance string into a whole number of credits. Floors
 * because a partial credit can't fund a whole $1 entry. Null / malformed → 0.
 *
 * @param raw - The `availableAmount` string from `/me/credits`
 * @returns Whole credits available
 */
function parseCredits(raw: string | null): number {
	if (raw === null) return 0;
	const parsed = Number.parseFloat(raw);
	return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
}

/**
 * Subscriber lower half of the entry block. Splits on `has_credits`:
 *   - Past due → red renew notice + a full-retail one-time purchase.
 *   - Has credits (State A) → credits-tender entry panel; Continue spends credits.
 *   - Zero credits (State B) → out-of-credits prompt → next-tier upsell modal →
 *     (on decline) full-retail one-time purchase with card / crypto.
 *
 * The Access Pass / AMOE disclosure is never shown to a subscriber.
 *
 * @param props - Pricing, plan, credits, and the shared quantity state
 * @returns The subscriber entry section
 */
export function SubscriberEntry({
	price,
	currency,
	planName,
	discountPercent,
	isPastDue,
	availableCredits,
	quantity,
	onQuantityChange,
	sweepstakesName,
	publicSlug,
}: SubscriberEntryProps) {
	const creditsAvailable = parseCredits(availableCredits);

	if (isPastDue) {
		return (
			<>
				<PastDueNotice planName={planName} />
				<OneTimePurchase
					price={price}
					currency={currency}
					quantity={quantity}
					onQuantityChange={onQuantityChange}
					sweepstakesName={sweepstakesName}
					publicSlug={publicSlug}
				/>
			</>
		);
	}

	if (creditsAvailable > 0) {
		return (
			<StateACredits
				price={price}
				currency={currency}
				planName={planName}
				discountPercent={discountPercent}
				creditsAvailable={creditsAvailable}
				quantity={quantity}
				onQuantityChange={onQuantityChange}
				sweepstakesName={sweepstakesName}
				publicSlug={publicSlug}
			/>
		);
	}

	return (
		<StateBNoCredits
			price={price}
			currency={currency}
			planName={planName}
			quantity={quantity}
			onQuantityChange={onQuantityChange}
			sweepstakesName={sweepstakesName}
			publicSlug={publicSlug}
		/>
	);
}

interface StateACreditsProps {
	readonly price: number;
	readonly currency: string;
	readonly planName: string | null;
	readonly discountPercent: number;
	readonly creditsAvailable: number;
	readonly quantity: number;
	readonly onQuantityChange: (quantity: number) => void;
	readonly sweepstakesName: string;
	readonly publicSlug: string;
}

/**
 * State A — subscriber with credits. Credits are the automatic tender; Continue
 * spends them (decrementing the shown balance) and opens the confirmation modal.
 *
 * @param props - Pricing, plan, balance, and the shared quantity state
 * @returns The credits entry flow
 */
function StateACredits({
	price,
	currency,
	planName,
	discountPercent,
	creditsAvailable,
	quantity,
	onQuantityChange,
	sweepstakesName,
	publicSlug,
}: StateACreditsProps) {
	// Local mirror of the balance so the confirmation visibly deducts the spend
	// (no real backend in preview). Resets on remount, which is fine for a demo.
	const [balance, setBalance] = useState(creditsAvailable);
	const [isConfirmedOpen, setIsConfirmedOpen] = useState(false);

	function handleContinue() {
		setBalance(current => Math.max(0, current - quantity));
		setIsConfirmedOpen(true);
	}

	return (
		<>
			<SubscriberBanner planName={planName} creditsAvailable={balance} />
			<BuyEntriesPanel
				price={price}
				currency={currency}
				discountPercent={discountPercent}
				planName={planName}
				isSubscriber
				sweepstakesName={sweepstakesName}
				quantity={quantity}
				onQuantityChange={onQuantityChange}
				tender="credits"
				showDisclosure={false}
				maxQuantity={balance}
				onContinue={handleContinue}
			/>
			<EntriesConfirmedModal
				open={isConfirmedOpen}
				onOpenChange={setIsConfirmedOpen}
				publicSlug={publicSlug}
				raffleTitle={sweepstakesName}
			/>
		</>
	);
}

interface StateBNoCreditsProps {
	readonly price: number;
	readonly currency: string;
	readonly planName: string | null;
	readonly quantity: number;
	readonly onQuantityChange: (quantity: number) => void;
	readonly sweepstakesName: string;
	readonly publicSlug: string;
}

/**
 * State B — subscriber with zero credits. The tier selector is hidden upfront;
 * Continue opens the next-tier upsell modal (skipped for Pro, who have no higher
 * tier). Declining the upgrade falls back to a full-retail one-time purchase.
 *
 * @param props - Pricing, plan, and the shared quantity state
 * @returns The out-of-credits entry flow
 */
function StateBNoCredits({
	price,
	currency,
	planName,
	quantity,
	onQuantityChange,
	sweepstakesName,
	publicSlug,
}: StateBNoCreditsProps) {
	const nextTier = getNextTierUp(planName);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isFallbackOpen, setIsFallbackOpen] = useState(false);

	function handleContinue() {
		// Pro has no higher tier — go straight to the one-time purchase.
		if (nextTier === null) {
			setIsFallbackOpen(true);
			return;
		}
		setIsModalOpen(true);
	}

	function handleDecline() {
		setIsModalOpen(false);
		setIsFallbackOpen(true);
	}

	return (
		<>
			<SubscriberBanner planName={planName} creditsAvailable={0} />
			{isFallbackOpen ? (
				<OneTimePurchase
					price={price}
					currency={currency}
					quantity={quantity}
					onQuantityChange={onQuantityChange}
					sweepstakesName={sweepstakesName}
					publicSlug={publicSlug}
				/>
			) : (
				<OutOfCreditsPrompt onContinue={handleContinue} />
			)}
			{nextTier !== null ? (
				<OutOfCreditsModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					nextTier={nextTier}
					quantity={quantity}
					onDecline={handleDecline}
				/>
			) : null}
		</>
	);
}

interface OutOfCreditsPromptProps {
	readonly onContinue: () => void;
}

/** Zero-balance prompt shown before the tier selector — Continue opens the upsell. */
function OutOfCreditsPrompt({ onContinue }: OutOfCreditsPromptProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="border-border flex flex-col gap-1 rounded-2xl border p-4 text-center">
				<p className="text-sm font-semibold">You&apos;re out of credits</p>
				<p className="text-muted-foreground text-xs">
					Upgrade your plan for more monthly credits, or continue with a
					one-time purchase.
				</p>
			</div>
			<Button type="button" size="lg" onClick={onContinue} className="w-full">
				Continue
			</Button>
		</div>
	);
}

interface OneTimePurchaseProps {
	readonly price: number;
	readonly currency: string;
	readonly quantity: number;
	readonly onQuantityChange: (quantity: number) => void;
	readonly sweepstakesName: string;
	readonly publicSlug: string;
}

/**
 * Full-retail one-time purchase with a card / crypto choice — the fallback when
 * a subscriber has no credits (and declined the upgrade) or is past due. No
 * subscriber discount applies here; the price is the plain retail price.
 *
 * @param props - Pricing and the shared quantity state
 * @returns The one-time purchase fallback
 */
function OneTimePurchase({
	price,
	currency,
	quantity,
	onQuantityChange,
	sweepstakesName,
	publicSlug,
}: OneTimePurchaseProps) {
	const [method, setMethod] = useState<PaymentMethod>('card');
	const [isConfirmedOpen, setIsConfirmedOpen] = useState(false);

	return (
		<>
			<PaymentMethodChoice method={method} onChange={setMethod} />
			<BuyEntriesPanel
				price={price}
				currency={currency}
				discountPercent={0}
				planName={null}
				isSubscriber={false}
				sweepstakesName={sweepstakesName}
				quantity={quantity}
				onQuantityChange={onQuantityChange}
				tender="cash"
				showDisclosure={false}
				onContinue={() => setIsConfirmedOpen(true)}
			/>
			<EntriesConfirmedModal
				open={isConfirmedOpen}
				onOpenChange={setIsConfirmedOpen}
				publicSlug={publicSlug}
				raffleTitle={sweepstakesName}
			/>
		</>
	);
}

type PaymentMethod = 'card' | 'crypto';

interface PaymentMethodChoiceProps {
	readonly method: PaymentMethod;
	readonly onChange: (method: PaymentMethod) => void;
}

/** Card / Crypto segmented choice for the full-retail one-time fallback. */
function PaymentMethodChoice({ method, onChange }: PaymentMethodChoiceProps) {
	return (
		<div className="grid grid-cols-2 gap-2">
			<MethodPill
				label="Card"
				icon={CreditCard}
				isActive={method === 'card'}
				onClick={() => onChange('card')}
			/>
			<MethodPill
				label="Crypto"
				icon={Bitcoin}
				isActive={method === 'crypto'}
				onClick={() => onChange('crypto')}
			/>
		</div>
	);
}

interface MethodPillProps {
	readonly label: string;
	readonly icon: ComponentType<{ className?: string }>;
	readonly isActive: boolean;
	readonly onClick: () => void;
}

/** One payment-method pill — outlined when active. */
function MethodPill({ label, icon: Icon, isActive, onClick }: MethodPillProps) {
	return (
		<button
			type="button"
			aria-pressed={isActive}
			onClick={onClick}
			className={cn(
				'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors duration-150',
				isActive
					? 'border-brand-dark border-2'
					: 'border-border hover:bg-muted/50',
			)}
		>
			<Icon className="size-4" />
			{label}
		</button>
	);
}

interface SubscriberBannerProps {
	readonly planName: string | null;
	readonly creditsAvailable: number;
}

/** Green subscriber banner — membership line (with tier glyph) + credit balance. */
function SubscriberBanner({
	planName,
	creditsAvailable,
}: SubscriberBannerProps) {
	return (
		<div className="bg-brand-mint/40 border-border flex flex-col gap-2 rounded-2xl border p-4">
			<p className="flex items-center gap-1.5 text-sm font-semibold">
				<PlanTierGlyph planName={planName} />
				You&apos;re a {planName ?? 'subscriber'} member
			</p>
			<p className="text-brand-dark flex items-center gap-1.5 text-sm font-semibold">
				<Coins className="size-4 shrink-0" aria-hidden />
				{creditsAvailable} {creditsAvailable === 1 ? 'credit' : 'credits'}{' '}
				available
			</p>
		</div>
	);
}

interface PlanTierGlyphProps {
	readonly planName: string | null;
}

/**
 * Tier glyph beside the subscriber banner — a Star marks the Pro tier (echoing
 * the navbar SubscriptionPill's Pro glyph), Sparkles for every other plan.
 *
 * @param props - The subscriber's active plan name
 * @returns The tier glyph icon
 */
function PlanTierGlyph({ planName }: PlanTierGlyphProps) {
	const isPro = planName !== null && planName.toLowerCase().includes('pro');
	if (isPro) {
		return <Star className="text-brand-dark size-4 shrink-0" aria-hidden />;
	}
	return <Sparkles className="text-brand-dark size-4 shrink-0" aria-hidden />;
}

interface PastDueNoticeProps {
	readonly planName: string | null;
}

/**
 * Red dunning notice swapped in for the green subscriber banner when the
 * subscription is `past_due`. Routes to the Stripe Customer Portal via the
 * shared billing-portal hook so the user can fix the failed payment.
 *
 * @param props - The subscriber's plan name (drives the heading copy)
 * @returns The past-due renew notice
 */
function PastDueNotice({ planName }: PastDueNoticeProps) {
	// Reuses the same Stripe portal redirect the profile/pricing surfaces use —
	// transition + cache invalidation + full-page nav live in the hook.
	const { open, isPending } = useOpenBillingPortal();
	const heading =
		planName !== null
			? `Your ${planName} subscription has expired`
			: 'Your subscription has expired';
	return (
		<div className="border-destructive/30 bg-destructive/10 flex flex-col gap-3 rounded-2xl border p-4">
			<p className="text-destructive flex items-center gap-1.5 text-sm font-semibold">
				<TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
				{heading}
			</p>
			<p className="text-destructive/80 text-xs">
				Renew your subscription to keep your discount and weekly entries.
			</p>
			<Button
				type="button"
				variant="destructive"
				size="sm"
				onClick={open}
				disabled={isPending}
				className="w-full"
			>
				{isPending ? 'Opening…' : 'Manage subscription'}
			</Button>
		</div>
	);
}
