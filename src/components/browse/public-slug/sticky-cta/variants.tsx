'use client';

import { Loader2Icon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { NoPurchaseNecessaryFootnote } from '@/components/compliance/no-purchase-necessary-footnote';
import { RaffleQuestionModal } from '@/components/raffle/question-modal/question-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import type { StickyVariantState } from './use-sticky-state';

// Shared shell classes for the fixed-bottom bar — extracted so the
// unauth + purchasable branches don't drift on padding/background.
// `pb-[max(...)]` preserves iOS safe-area inset without hard-coding
// a pixel value, and `lg:hidden` keeps the sticky mobile-only.
const SHELL_CLASS =
	'fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden';

interface UnauthVariantProps {
	signInUrl: string;
}

/**
 * Unauth branch — guests can't purchase and can't earn an attributed
 * X share, so we collapse the bar to a single sign-in CTA. Share is
 * intentionally omitted across all screen sizes (desktop is gated in
 * `page.tsx` via `{isAuthenticated ? <ShareOnXButton /> : null}`).
 *
 * @param signInUrl - Destination carrying the current `returnTo` path.
 * @returns The sign-in sticky bar JSX.
 */
function UnauthVariant({ signInUrl }: UnauthVariantProps): React.JSX.Element {
	return (
		<div className={SHELL_CLASS}>
			{/* No id="checkout-action" here — guests don't trigger the
			    question modal, so the e2e mobile question-modal flow
			    doesn't depend on this branch. */}
			<Button
				asChild
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				<Link href={signInUrl}>
					<p className="font-semibold">Sign in to enter</p>
				</Link>
			</Button>
			{/* Footnote preserves the equal-prominence free-entry reference
			    even in the signed-out state — legal exposure is the same. */}
			<NoPurchaseNecessaryFootnote />
		</div>
	);
}

// Extract from `StickyVariantState` so the purchasable props list is
// a single reference site; any downstream shape change flows here.
type PurchasableState = Extract<StickyVariantState, { kind: 'purchasable' }>;

/**
 * Resolves the share button JSX for the purchasable variant. Three
 * sub-states: terminal-claim (disabled), post-share (verify CTA + optional
 * countdown), default (share prompt with optional quiz gate).
 */
function ShareButtonForPurchasable({
	state,
}: {
	state: PurchasableState;
}): React.JSX.Element {
	const { xShare, questionId, raffleId, xShareEnabled } = state;
	const {
		claimUsed,
		state: shareState,
		retryCountdown,
		handleShare,
		handleVerify,
	} = xShare;
	// Quiz gate — same pattern as desktop ShareOnXButton. Tokenized
	// share requires a correct answer before the backend issues an
	// intent. Plain shares bypass (no backend).
	const isTokenizedFlow = xShareEnabled && !claimUsed;
	const [showShareQuestionModal, setShowShareQuestionModal] = useState(false);
	const [shareQuestionAnswered, setShareQuestionAnswered] = useState(false);

	function handleShareClick(): void {
		if (questionId && isTokenizedFlow && !shareQuestionAnswered) {
			setShowShareQuestionModal(true);
			return;
		}
		void handleShare();
	}
	function handleShareCorrectAnswer(): void {
		setShareQuestionAnswered(true);
		void handleShare();
	}

	if (claimUsed) {
		return (
			<Button
				variant="outline"
				disabled
				className="h-12 w-full rounded-full border-2 border-gray-300 bg-gray-50 text-gray-400"
			>
				<p className="font-semibold">Already claimed bonus entry</p>
			</Button>
		);
	}
	if (shareState === 'shared' || shareState === 'verifying') {
		return (
			<div className="flex w-full flex-col gap-1">
				<Button
					variant="outline"
					onClick={handleVerify}
					disabled={shareState === 'verifying'}
					className="h-12 w-full cursor-pointer rounded-full border-2 border-black bg-white text-black hover:bg-gray-50"
				>
					<p className="font-semibold">
						{shareState === 'verifying'
							? 'Verifying...'
							: 'I shared it — Claim my bonus entry!'}
					</p>
				</Button>
				{retryCountdown > 0 && shareState === 'shared' ? (
					<p className="text-center text-xs text-gray-400">
						Auto-checking in {retryCountdown}s...
					</p>
				) : null}
			</div>
		);
	}
	return (
		<>
			<Button
				variant="outline"
				onClick={handleShareClick}
				disabled={shareState === 'loading'}
				className="h-12 w-full cursor-pointer rounded-full border-2 border-black bg-white text-black hover:bg-gray-50"
			>
				<p className="font-semibold">
					{shareState === 'loading'
						? 'Preparing...'
						: 'Get Bonus Entries! Share on X'}
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

/**
 * Purchasable branch — full sticky bar: bundle quick-picks, primary
 * "One Time Purchase - $X.XX" CTA, no-purchase footnote, optional question
 * modal, and the share-on-X button.
 */
function PurchasableVariant({
	state,
}: {
	state: PurchasableState;
}): React.JSX.Element {
	const {
		bundles,
		primaryCtaLabel,
		primaryCtaTitle,
		isPrimaryCtaDisabled,
		isCheckoutLoading,
		initiateCheckout,
		showQuestionModal,
		setShowQuestionModal,
		handleCheckoutCorrectAnswer,
		questionId,
		raffleId,
		isFreeTicketsPromo,
	} = state;
	return (
		<div className={SHELL_CLASS}>
			{/* Mobile bundle quick-picks — additive. Hidden for free-tickets
			    promos where the granted count locks quantity and bundles
			    would silently no-op (or exceed the grant). */}
			{bundles.hidden ? null : (
				<div className="flex items-center justify-between gap-2">
					{bundles.sizes.map(size => (
						<button
							key={size}
							onClick={() => bundles.onPick(size)}
							disabled={bundles.disabled}
							className={cn(
								'hover:bg-brand-sky flex w-full cursor-pointer items-center justify-center rounded-full border border-black py-3 text-sm transition-colors duration-150',
								'disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent',
							)}
						>
							+{size}
						</button>
					))}
				</div>
			)}
			{/* Primary CTA — drives the same useStripeCheckout hook as the
			    desktop in-card BuyButton. Owns `id="checkout-action"` because
			    on mobile this is the only visible trigger for the quiz modal
			    (the in-card BuyButton is hidden via `hidden lg:block`). */}
			<Button
				id="checkout-action"
				onClick={initiateCheckout}
				disabled={isPrimaryCtaDisabled}
				title={primaryCtaTitle}
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				{isCheckoutLoading ? (
					<Loader2Icon data-icon="inline-start" className="animate-spin" />
				) : null}
				<p className="font-semibold">{primaryCtaLabel}</p>
			</Button>
			{isFreeTicketsPromo ? null : <NoPurchaseNecessaryFootnote />}
			{questionId ? (
				<RaffleQuestionModal
					open={showQuestionModal}
					onOpenChange={setShowQuestionModal}
					raffleId={raffleId}
					onCorrectAnswer={handleCheckoutCorrectAnswer}
				/>
			) : null}
			<ShareButtonForPurchasable state={state} />
		</div>
	);
}

/**
 * Dispatches the sticky CTA render by variant kind. Exhaustive switch
 * with `default: never` — adding a new kind forces a compile error.
 *
 * @param state - Discriminated union from `useStickyState`.
 * @returns The JSX for the active variant, or `null` for host-disabled.
 */
export function StickyCtaVariants({
	state,
}: {
	state: StickyVariantState;
}): React.JSX.Element | null {
	switch (state.kind) {
		case 'unauthenticated':
			return <UnauthVariant signInUrl={state.signInUrl} />;
		case 'host-disabled':
			// Host viewing their own sweepstakes — inline TicketPurchaseCard
			// already renders disabled BuyButton + the "You cannot enter your
			// own sweepstakes" gate. Rendering an active-looking sticky on
			// top would contradict that.
			return null;
		case 'purchasable':
			return <PurchasableVariant state={state} />;
		default: {
			// Exhaustiveness — compile-time guard against unhandled kinds.
			const never: never = state;
			return never;
		}
	}
}
