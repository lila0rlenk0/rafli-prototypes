'use client';

import { Button } from '@/components/ui/button';

import { type XShareConfig, useXShare } from './use-x-share';

/**
 * "Get Free Tickets! Share on X" button for the desktop checkout card.
 *
 * Flow when xShareEnabled:
 * 1. Click → POST /x-share-intent → get tokenized share URL
 * 2. Open X intent with that URL
 * 3. Show "I shared it" button → POST /verify-x-share → grant ticket
 *
 * Falls back to plain share (no ticket) when xShare is disabled or claim is terminal.
 */
export function ShareOnXButton(props: XShareConfig) {
	const {
		state,
		alreadyVerified,
		claimUsed,
		xShareClaimStatus,
		retryCountdown,
		handleShare,
		handleVerify,
	} = useXShare(props);

	// Terminal claim — show disabled button so user knows the feature exists but is consumed
	if (claimUsed) {
		const label = alreadyVerified
			? 'Free ticket already redeemed'
			: xShareClaimStatus === 'expired'
				? 'Free ticket share expired'
				: 'Free ticket share revoked';

		return (
			<Button
				variant="outline"
				disabled
				className="mt-2 h-12 w-full rounded-full border-2 border-gray-300 bg-gray-50 text-gray-400"
			>
				<p className="font-semibold">{label}</p>
			</Button>
		);
	}

	// Verification button — shown after sharing or when resuming a pending claim
	if (state === 'shared' || state === 'verifying') {
		// Auto-retry countdown active — show seconds remaining
		const isCountingDown = retryCountdown > 0 && state === 'shared';

		return (
			<div className="mt-2 flex flex-col gap-1">
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
				{isCountingDown ? (
					<p className="text-center text-xs text-gray-400">
						Auto-checking in {retryCountdown}s...
					</p>
				) : null}
			</div>
		);
	}

	return (
		<Button
			variant="outline"
			onClick={handleShare}
			disabled={state === 'loading'}
			className="mt-2 h-12 w-full cursor-pointer rounded-full border-2 border-black bg-white text-black hover:bg-gray-50"
		>
			<p className="font-semibold">
				{state === 'loading' ? 'Preparing...' : 'Get Free Tickets! Share on X'}
			</p>
		</Button>
	);
}
