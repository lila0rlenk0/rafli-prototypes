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
 * Falls back to plain share (no ticket) when xShare is disabled or claim already verified.
 */
export function ShareOnXButton(props: XShareConfig) {
	const { state, alreadyVerified, handleShare, handleVerify } =
		useXShare(props);

	// Already earned — quiet confirmation, no further action needed
	if (alreadyVerified) {
		return (
			<p className="mt-2 text-center text-sm text-gray-500">
				Free ticket earned from sharing on X
			</p>
		);
	}

	// Verification button — shown after sharing or when resuming a pending claim
	if (state === 'shared' || state === 'verifying') {
		return (
			<Button
				variant="outline"
				onClick={handleVerify}
				disabled={state === 'verifying'}
				className="mt-2 h-12 w-full cursor-pointer rounded-full border-2 border-black bg-white text-black hover:bg-gray-50"
			>
				<p className="font-semibold">
					{state === 'verifying'
						? 'Verifying...'
						: 'I shared it — Claim my free ticket!'}
				</p>
			</Button>
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
