'use client';

import { useState } from 'react';

import { RaffleQuestionModal } from '@/components/raffle/question-modal/question-modal';
import { Button } from '@/components/ui/button';

import { type XShareConfig, useXShare } from './x-share/use-share';

/**
 * "AMOE - Free Entries" button for the desktop checkout card.
 *
 * Flow when xShareEnabled:
 * 1. Click → quiz gate (if questionId set) → POST /x-share-intent → get tokenized share URL
 * 2. Open X intent with that URL
 * 3. Show "I shared it" button → POST /verify-x-share → grant bonus entry
 *
 * Falls back to plain share (no entry grant) when xShare is disabled or claim is terminal.
 */
export function ShareOnXButton(props: XShareConfig) {
	const { state, claimUsed, handleShare, handleVerify } = useXShare(props);

	// Quiz gate — same pattern as BuyButton/CryptoBuyButton.
	// Without this, createXShareIntent rejects with core:xshare:question-required
	// when the raffle has a check-in question and the user hasn't answered correctly.
	const [showQuestionModal, setShowQuestionModal] = useState(false);
	const [questionAnswered, setQuestionAnswered] = useState(false);

	// Quiz gate only applies to the tokenized flow — plain shares don't call
	// createXShareIntent so the backend never checks quiz state for those.
	const isTokenizedFlow = props.xShareEnabled && !claimUsed;

	function handleShareClick() {
		if (props.questionId && isTokenizedFlow && !questionAnswered) {
			setShowQuestionModal(true);
			return;
		}
		void handleShare();
	}

	function handleCorrectAnswer() {
		setQuestionAnswered(true);
		// Proceed with share immediately after answering correctly
		void handleShare();
	}

	// Terminal claim — disabled button so user knows the feature exists but is consumed
	if (claimUsed) {
		return (
			<Button
				variant="outline"
				disabled
				className="mt-2 h-12 w-full rounded-full border-2"
			>
				<p className="font-semibold">Already claimed bonus entry</p>
			</Button>
		);
	}

	// Verification button — shown after sharing or when resuming a pending claim.
	// Backend grants the ticket on the first verify call regardless of whether
	// the tweet was indexed by X, so the click is a one-shot action.
	if (state === 'shared' || state === 'verifying') {
		return (
			<Button
				variant="outline"
				onClick={handleVerify}
				disabled={state === 'verifying'}
				className="mt-2 h-12 w-full cursor-pointer rounded-full border-2"
			>
				<p className="font-semibold">
					{state === 'verifying'
						? 'Verifying...'
						: 'I shared it — Claim my bonus entry!'}
				</p>
			</Button>
		);
	}

	return (
		<>
			<Button
				variant="outline"
				onClick={handleShareClick}
				disabled={state === 'loading'}
				className="mt-2 h-12 w-full cursor-pointer rounded-full border-2"
			>
				<p className="font-semibold">
					{state === 'loading' ? 'Preparing...' : 'AMOE - Free Entries'}
				</p>
			</Button>

			{props.questionId ? (
				<RaffleQuestionModal
					open={showQuestionModal}
					onOpenChange={setShowQuestionModal}
					raffleId={props.raffleId}
					onCorrectAnswer={handleCorrectAnswer}
				/>
			) : null}
		</>
	);
}
