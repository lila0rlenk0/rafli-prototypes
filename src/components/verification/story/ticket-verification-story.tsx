'use client';

import { Loader2 } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';

import { TicketVerificationStoryForm } from '@/components/verification/story/ticket-verification-story-form';
import {
	getVerificationStoryErrorMessage,
	type TicketVerificationStoryPayload,
} from '@/components/verification/story/ticket-verification-story-model';
import { StoryError } from '@/components/verification/story/ticket-verification-story-presentation';
import { TicketVerificationStoryResult } from '@/components/verification/story/ticket-verification-story-steps';
import { getMerkleProof } from '@/services/verification/get-merkle-proof';
import { getRaffleVerification } from '@/services/verification/get-raffle-verification';
import { verifyTicket } from '@/services/verification/verify-ticket';
import { verifyWinner } from '@/services/verification/verify-winner';

/** Phase-based state machine for the verification flow */
type StoryPhaseState =
	| { phase: 'form' }
	| { phase: 'loading' }
	| { phase: 'result'; data: TicketVerificationStoryPayload }
	| { phase: 'error'; message: string };

/**
 * TicketVerificationStory
 *
 * Interactive verification component that tells the full story of an entry's
 * participation in a sweepstake draw. Shows 3 steps:
 * 1. Found in the committed set (IPFS ledger)
 * 2. Cryptographically verified (Merkle proof)
 * 3. Draw result (formula math — who won and why)
 *
 * For non-winners, step 3 shows the exact math that selected a different entry.
 * For winners, step 3 shows the math that selected their entry.
 */
export function TicketVerificationStory() {
	const [raffleSlug, setRaffleSlug] = useState('');
	const [ticketCode, setTicketCode] = useState('');
	const [state, setState] = useState<StoryPhaseState>({ phase: 'form' });

	/**
	 * Verification flow:
	 * 1. Verify ticket exists (required — fail fast if not found)
	 * 2. Fetch merkle proof, raffle data, winner formula in parallel (best-effort)
	 *
	 * For non-winners, we fetch position 0 (1st place) to show the formula.
	 * For winners, we fetch their specific position's formula.
	 */
	async function handleVerify(e: SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!raffleSlug.trim() || !ticketCode.trim()) return;

		setState({ phase: 'loading' });

		// Step 1: Verify the ticket exists in the committed dataset.
		// This is the only required call — if it fails, we show an error immediately.
		const ticketResponse = await verifyTicket(
			raffleSlug.trim(),
			ticketCode.trim(),
		);

		if (!ticketResponse.success) {
			setState({
				phase: 'error',
				message: getVerificationStoryErrorMessage(ticketResponse.error),
			});
			return;
		}

		const ticket = ticketResponse.data;

		// Step 2: Fetch supplementary data in parallel.
		// All three calls are best-effort — the story degrades gracefully if any fail.
		// Winner position: own position if winner, otherwise position 0 (1st place)
		// to show the formula that selected the actual winner.
		// Backend sends `winnerPosition: null` for losing tickets, so narrow on null
		// rather than undefined — the `isWinner` guard already ensures the number branch.
		const winnerPosition =
			ticket.isWinner && ticket.winnerPosition !== null
				? ticket.winnerPosition
				: 0;

		const [proofResult, raffleResult, winnerResult] = await Promise.all([
			getMerkleProof(ticket.raffleId, ticket.ticketId),
			getRaffleVerification(ticket.raffleId),
			verifyWinner(ticket.raffleId, winnerPosition),
		]);

		setState({
			phase: 'result',
			data: {
				ticket,
				proof: proofResult.success ? proofResult.data : null,
				raffle: raffleResult.success ? raffleResult.data : null,
				drawFormula: winnerResult.success ? winnerResult.data : null,
			},
		});
	}

	function handleReset() {
		setState({ phase: 'form' });
		setRaffleSlug('');
		setTicketCode('');
	}

	switch (state.phase) {
		case 'form':
			return (
				<TicketVerificationStoryForm
					raffleSlug={raffleSlug}
					ticketCode={ticketCode}
					onRaffleSlugChange={setRaffleSlug}
					onTicketCodeChange={setTicketCode}
					onSubmit={handleVerify}
				/>
			);
		case 'loading':
			return (
				<div className="flex flex-col items-center justify-center py-12">
					<Loader2 className="text-muted-foreground mb-3 size-8 animate-spin" />
					<p className="text-muted-foreground text-sm">
						Verifying your entry...
					</p>
				</div>
			);
		case 'result':
			return (
				<TicketVerificationStoryResult
					data={state.data}
					onReset={handleReset}
				/>
			);
		case 'error':
			return <StoryError message={state.message} onReset={handleReset} />;
	}
}
