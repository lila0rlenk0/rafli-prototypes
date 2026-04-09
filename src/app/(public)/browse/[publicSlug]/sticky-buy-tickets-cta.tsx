'use client';

import { useEffect, useState } from 'react';

import { RaffleQuestionModal } from '@/components/raffle/raffle-question-modal';
import { Button } from '@/components/ui/button';

import { type XShareConfig, useXShare } from './use-x-share';

interface StickyBuyTicketsCtaProps extends XShareConfig {
	/** Unauthenticated users get plain share — can't attribute tickets without an account */
	isAuthenticated: boolean;
}

/**
 * Threshold for considering the checkout section "visible enough"
 * that the user can interact with it directly. At 0.6, the buy button
 * at the bottom of the card is reliably in view.
 */
const VISIBILITY_THRESHOLD = 0.6;

/**
 * Sticky CTA bar at the bottom of the viewport with "Enter Now!" and
 * "Get Free Tickets! Share on X" buttons.
 *
 * - When checkout section is NOT visible: smooth-scrolls to it
 * - When checkout section IS visible: programmatically clicks the
 *   real buy button (#checkout-action) so the purchase flow starts
 *
 * Hidden on desktop (lg:) where the sidebar checkout is always alongside content.
 */
export function StickyBuyTicketsCta({
	raffleId,
	title,
	publicSlug,
	xShareEnabled,
	xShareClaimStatus,
	questionId,
	isAuthenticated,
}: StickyBuyTicketsCtaProps) {
	const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);

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

	// Quiz gate — same pattern as desktop ShareOnXButton and buy buttons.
	// Prevents backend rejection with core:xshare:question-required.
	const [showQuestionModal, setShowQuestionModal] = useState(false);
	const [questionAnswered, setQuestionAnswered] = useState(false);

	function handleShareClick() {
		if (questionId && !questionAnswered) {
			setShowQuestionModal(true);
			return;
		}
		handleShare();
	}

	function handleCorrectAnswer() {
		setQuestionAnswered(true);
		handleShare();
	}

	// useEffect: mount-only IntersectionObserver for checkout section visibility.
	// Deps: [] — target element is static, observer setup runs once.
	// Cleanup: disconnects observer to prevent memory leak on unmount.
	// Why effect: browser API (IntersectionObserver) requires DOM access post-mount.
	// Drives CTA behavior: scroll-to when hidden, click-through when visible.
	useEffect(() => {
		const target = document.getElementById('checkout-section');
		if (!target) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsCheckoutVisible(entry.intersectionRatio >= VISIBILITY_THRESHOLD);
			},
			{ threshold: [0, VISIBILITY_THRESHOLD] },
		);

		observer.observe(target);

		return () => {
			observer.disconnect();
		};
	}, []);

	function handleEnterNow() {
		if (isCheckoutVisible) {
			const actionButton = document.getElementById('checkout-action');
			if (actionButton) {
				actionButton.click();
				return;
			}
		}

		document
			.getElementById('checkout-section')
			?.scrollIntoView({ behavior: 'smooth' });
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
						open={showQuestionModal}
						onOpenChange={setShowQuestionModal}
						raffleId={raffleId}
						onCorrectAnswer={handleCorrectAnswer}
					/>
				) : null}
			</>
		);
	}

	return (
		<div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
			<Button
				onClick={handleEnterNow}
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				<p className="font-semibold">Enter Now!</p>
			</Button>
			{getShareButton()}
		</div>
	);
}
