'use client';

import { Loader2Icon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';
import {
	calculateOrderTotal,
	formatPrice,
} from '@/lib/checkout/calculate-order-total';
import { useStripeCheckout } from '@/lib/checkout/use-stripe-checkout';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';

import { type XShareConfig, useXShare } from './use-x-share';

// Mobile quick-pick bundle sizes — additive (+10/+25/+50). Mirrored from
// the previous in-card mobile bundles, lifted into the sticky CTA so they
// remain visible above the keyboard while users are scrolled inside the
// raffle description or comments.
const BUNDLE_SIZES_MOBILE = [10, 25, 50];

interface StickyBuyTicketsCtaProps extends XShareConfig {
	/** Unauthenticated users get plain share — can't attribute tickets without an account */
	isAuthenticated: boolean;
	/** Cap for bundle quick-picks. 0 = unlimited participants. */
	availableTickets: number;
	/** Mirrors the card's purchase-disabled gate (own raffle, not yet open, etc.) */
	disabled?: boolean;
	/** Per-ticket price in major currency units — drives the inline total label. */
	price: number;
	/** ISO 4217 currency code — drives the inline total label format. */
	currency: string;
}

/**
 * Sticky CTA bar at the bottom of the viewport (mobile only).
 *
 * Three rendering branches, in priority order:
 *
 * 1. **Unauthenticated** — collapses to a single "Sign in to buy tickets"
 *    Link. Guests can't purchase and can't earn an attributed X share, so
 *    bundles, share, and the buy CTA are all hidden — they'd be misleading.
 * 2. **Host viewing own raffle** (`disabled=true`) — returns null entirely.
 *    The inline `TicketPurchaseCard` already renders disabled BuyButton +
 *    CryptoBuyButton plus the explicit "You cannot purchase tickets for your
 *    own raffle" gate message. Per the user's directive — "fixed-bottom
 *    components must respect the same logical reasoning as the card" and
 *    "we don't have to show them in both places on mobile" — the card is
 *    the single source of truth for the host case.
 * 3. **Authenticated, non-host** — full bar: bundle quick-picks, primary
 *    "Enter Now! · $X.XX" CTA driven by the same `useStripeCheckout` hook as
 *    the desktop in-card BuyButton, and the "Get Free Tickets! Share on X"
 *    secondary CTA (with claim-flow states).
 *
 * Hidden on desktop (`lg:hidden`) where the sidebar checkout is always
 * alongside content.
 */
export function StickyBuyTicketsCta({
	raffleId,
	title,
	publicSlug,
	xShareEnabled,
	xShareClaimStatus,
	questionId,
	isAuthenticated,
	availableTickets,
	disabled = false,
	price,
	currency,
}: StickyBuyTicketsCtaProps) {
	// returnTo construction for the unauth sign-in link — preserves any query
	// params (e.g. ?code=PROMO) so the user lands on the same raffle context
	// after signing in. Mirrors the logic in `SignInToBuyButton`.
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Bundle quick-picks mutate the same store the inline TicketSelector reads,
	// so the counter inside the card updates in lockstep with sticky-bar clicks.
	// `appliedPromo` drives the inline total label so a discount/free-tickets
	// promo applied via the card's PromoCodeInput is reflected in the sticky's
	// price the moment the user scrolls back down to the bar.
	const quantity = useTicketQuantityStore(state => state.quantity);
	const incrementBy = useTicketQuantityStore(state => state.incrementBy);
	const appliedPromo = useTicketQuantityStore(state => state.appliedPromo);

	// 0 means unlimited participants — bundle clicks then never need clamping.
	const isUnlimited = availableTickets === 0;
	// Bundle disabled only when the user has already reached the participant
	// cap. The host case (where `disabled` would be true) early-returns null
	// further down, so we never reach this calculation in that branch — no
	// need to OR `disabled` in here.
	const bundleDisabled = !isUnlimited && quantity >= availableTickets;

	function handleBundleClick(size: number) {
		// `incrementBy` clamps to availableTickets when finite. Pass 0 for
		// unlimited raffles to skip the clamp branch entirely.
		incrementBy(size, isUnlimited ? 0 : availableTickets);
	}

	// Stripe checkout — same hook the desktop in-card BuyButton uses, so the
	// quiz gate, free-tickets shortcut, single-flight guard, and promo
	// invalidation all behave identically across breakpoints. Two hook
	// instances coexist (card + sticky) but only one is visible at any time.
	const {
		isLoading: isCheckoutLoading,
		showQuestionModal,
		setShowQuestionModal,
		initiate: initiateCheckout,
		handleCorrectAnswer: handleCheckoutCorrectAnswer,
	} = useStripeCheckout({
		raffleId,
		publicSlug,
		questionId,
		disabled,
	});

	const { state, claimUsed, retryCountdown, handleShare, handleVerify } =
		useXShare({
			raffleId,
			title,
			publicSlug,
			// Unauthenticated users always get plain share — tokenized flow requires auth
			xShareEnabled: isAuthenticated && xShareEnabled,
			xShareClaimStatus,
			questionId,
		});

	// Quiz gate for the share-on-X button — separate from the checkout quiz
	// gate above. Same pattern as desktop ShareOnXButton: tokenized share flow
	// requires the user to answer the question once before the backend will
	// issue a share intent.
	const isTokenizedFlow = isAuthenticated && xShareEnabled && !claimUsed;
	const [showShareQuestionModal, setShowShareQuestionModal] = useState(false);
	const [shareQuestionAnswered, setShareQuestionAnswered] = useState(false);

	function handleShareClick() {
		if (questionId && isTokenizedFlow && !shareQuestionAnswered) {
			setShowShareQuestionModal(true);
			return;
		}
		handleShare();
	}

	function handleShareCorrectAnswer() {
		setShareQuestionAnswered(true);
		handleShare();
	}

	// Order total drives the inline "· $X.XX" label on the primary CTA.
	// Computing here keeps the sticky and the card visually consistent — both
	// run the same `calculateOrderTotal` so any divergence is impossible.
	const { total, isFreeTicketsPromo, freeTicketCount } = calculateOrderTotal({
		price,
		quantity,
		appliedPromo,
	});

	/**
	 * Builds the primary CTA label. Free-tickets promos flip to a "Claim free
	 * ticket(s)" copy with the granted count, mirroring the desktop BuyButton.
	 * Otherwise we render "Enter Now! · $X.XX" so the user always sees what
	 * they pay even when scrolled past the inline card breakdown.
	 */
	function getPrimaryCtaLabel(): string {
		if (isCheckoutLoading) return 'Processing...';
		if (isFreeTicketsPromo) {
			return `Claim free ticket${freeTicketCount > 1 ? 's' : ''}`;
		}
		return `Enter Now! · ${formatPrice(total, currency)}`;
	}

	/**
	 * Resolves share button variant based on claim lifecycle state.
	 * Guard clauses for terminal/post-share states, default is the share prompt.
	 */
	function getShareButton() {
		// Terminal claim — disabled button so user sees the feature is consumed
		if (claimUsed) {
			return (
				<Button
					variant="outline"
					disabled
					className="h-12 w-full rounded-full border-2 border-gray-300 bg-gray-50 text-gray-400"
				>
					<p className="font-semibold">Already claimed free entry</p>
				</Button>
			);
		}

		// Post-share — verify CTA with optional auto-check countdown
		if (state === 'shared' || state === 'verifying') {
			return (
				<div className="flex w-full flex-col gap-1">
					<Button
						variant="outline"
						onClick={handleVerify}
						disabled={state === 'verifying'}
						className="h-12 w-full cursor-pointer rounded-full border-2 border-black bg-white text-black hover:bg-gray-50"
					>
						<p className="font-semibold">
							{state === 'verifying'
								? 'Verifying...'
								: 'I shared it — Claim my free ticket!'}
						</p>
					</Button>
					{retryCountdown > 0 && state === 'shared' ? (
						<p className="text-center text-xs text-gray-400">
							Auto-checking in {retryCountdown}s...
						</p>
					) : null}
				</div>
			);
		}

		// Default — share prompt with optional quiz gate
		return (
			<>
				<Button
					variant="outline"
					onClick={handleShareClick}
					disabled={state === 'loading'}
					className="h-12 w-full cursor-pointer rounded-full border-2 border-black bg-white text-black hover:bg-gray-50"
				>
					<p className="font-semibold">
						{state === 'loading'
							? 'Preparing...'
							: 'Get Free Tickets! Share on X'}
					</p>
				</Button>

				{questionId ? (
					<RaffleQuestionModal
						open={showShareQuestionModal}
						onOpenChange={setShowShareQuestionModal}
						raffleId={raffleId}
						onCorrectAnswer={handleShareCorrectAnswer}
					/>
				) : null}
			</>
		);
	}

	// Unauth branch — guests can't purchase and can't earn an attributed
	// X share, so we collapse the bar to a single sign-in CTA. The share
	// button is intentionally omitted across all screen sizes (desktop is
	// gated in page.tsx via `{isAuthenticated ? <ShareOnXButton /> : null}`).
	if (!isAuthenticated) {
		const search = searchParams.toString();
		const fullPath = search ? `${pathname}?${search}` : pathname;
		const signInUrl = `/sign-in?returnTo=${encodeURIComponent(fullPath)}`;

		return (
			<div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
				{/* No id="checkout-action" here — guests don't trigger the question
				    modal, so the e2e mobile question-modal flow doesn't depend on
				    this branch. */}
				<Button
					asChild
					className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
				>
					<Link href={signInUrl}>
						<p className="font-semibold">Sign in to buy tickets</p>
					</Link>
				</Button>
			</div>
		);
	}

	// Host viewing their own raffle (own draft via showEditButton, or own
	// live via disablePurchase — both arrive merged into the `disabled` prop).
	// The inline TicketPurchaseCard already renders disabled BuyButton +
	// CryptoBuyButton plus the explicit "You cannot purchase tickets for
	// your own raffle" gate message. Rendering an active-looking sticky bar
	// on top of that contradicts the card's disabled state and falsely
	// invites a click path that has nothing meaningful behind it.
	if (disabled) return null;

	return (
		<div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
			{/* Mobile bundle quick-picks — additive (+10/+25/+50). Mutates the
			    shared TicketQuantityStore so the inline counter inside the card
			    updates without prop drilling. Hidden when a free-tickets promo
			    is applied — quantity is locked to the granted count and bundles
			    would silently no-op (or worse, exceed the granted count). */}
			{!isFreeTicketsPromo ? (
				<div className="flex items-center justify-between gap-2">
					{BUNDLE_SIZES_MOBILE.map(size => (
						<button
							key={size}
							onClick={() => handleBundleClick(size)}
							disabled={bundleDisabled}
							className="flex w-full cursor-pointer items-center justify-center rounded-full border border-black py-3 text-sm transition-colors duration-150 hover:bg-[#C4EDFF] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
						>
							+{size}
						</button>
					))}
				</div>
			) : null}

			{/* Primary CTA — drives the same useStripeCheckout hook as the
			    desktop in-card BuyButton. Owns id="checkout-action" because on
			    mobile this is the only visible button that opens the quiz modal
			    (the in-card BuyButton is hidden via `hidden lg:block`). The
			    inline `· $X.XX` keeps the price visible even when the user is
			    scrolled past the card breakdown — standard mobile e-commerce
			    pattern (Amazon/Airbnb/Eventbrite). */}
			<Button
				id="checkout-action"
				onClick={initiateCheckout}
				disabled={isCheckoutLoading}
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				{isCheckoutLoading ? (
					<Loader2Icon className="mr-2 size-4 animate-spin" />
				) : null}
				<p className="font-semibold">{getPrimaryCtaLabel()}</p>
			</Button>

			{/* Question modal — owned by the sticky's `useStripeCheckout`
			    instance. Only renders when the raffle has a question and the
			    primary CTA is the trigger that opens it. Same modal component
			    is rendered by the in-card BuyButton on desktop, but only one
			    is visible at a time per breakpoint. */}
			{questionId ? (
				<RaffleQuestionModal
					open={showQuestionModal}
					onOpenChange={setShowQuestionModal}
					raffleId={raffleId}
					onCorrectAnswer={handleCheckoutCorrectAnswer}
				/>
			) : null}

			{/* Share-on-X is reachable here only for non-host authenticated
			    users — the host case (`disabled`) early-returns null above,
			    and unauth collapses to the sign-in branch. */}
			{getShareButton()}
		</div>
	);
}
