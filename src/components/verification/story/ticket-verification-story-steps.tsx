'use client';

import { ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { MerkleProofDisplay } from '@/components/verification/merkle-proof-display';
import {
	BlockchainLinks,
	FormulaDisplay,
	StoryStep,
	type StoryStepStatus,
} from '@/components/verification/story/ticket-verification-story-presentation';
import type { TicketVerificationStoryPayload } from '@/components/verification/story/ticket-verification-story-model';
import { getIpfsUrl } from '@/lib/verification/links';
import { formatWinnerPosition } from '@/lib/utils/raffle/winner-position';
import type {
	MerkleProof,
	RaffleVerificationPayload,
	TicketVerification,
	WinnerVerification,
} from '@/types/verification';

export interface TicketVerificationStoryResultProps {
	data: TicketVerificationStoryPayload;
	onReset: () => void;
}

/**
 * Renders the 3-step verification story after a successful ticket lookup.
 * Steps degrade gracefully — missing merkle/raffle/formula data is handled.
 */
export function TicketVerificationStoryResult({
	data,
	onReset,
}: TicketVerificationStoryResultProps) {
	const { ticket, proof, raffle, drawFormula } = data;

	return (
		<div className="flex flex-col gap-3">
			{/* Step 1: Ticket found in the committed dataset */}
			<FoundStep ticket={ticket} raffle={raffle} />

			{/* Step 2: Merkle proof verification */}
			<MerkleStep proof={proof} raffle={raffle} />

			{/* Step 3: Draw result — only shown for non-voided tickets */}
			{ticket.isVoided ? null : (
				<DrawResultStep
					ticket={ticket}
					drawFormula={drawFormula}
					raffle={raffle}
				/>
			)}

			{/* Footer actions */}
			<div className="flex flex-col gap-2 pt-2 sm:flex-row">
				<button
					type="button"
					onClick={onReset}
					className="border-border hover:bg-muted flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
				>
					Verify Another
				</button>
				<Link
					href={`/verify/${ticket.raffleId}`}
					className="bg-brand-dark border-brand-dark hover:text-brand-dark flex-1 rounded-lg border px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-white"
				>
					View Full Details
				</Link>
			</div>
		</div>
	);
}

interface FoundStepProps {
	ticket: TicketVerification;
	raffle: RaffleVerificationPayload | null;
}

function FoundStep({ ticket, raffle }: FoundStepProps) {
	const totalTickets = raffle?.totalTickets;
	const raffleTitle = raffle?.title;
	const manifestHash = raffle?.manifestHash;

	return (
		<StoryStep
			number={1}
			title={ticket.isVoided ? 'Found — voided' : 'Found in the committed set'}
			status={ticket.isVoided ? 'warning' : 'success'}
		>
			{ticket.isVoided ? (
				<p>
					Entry <strong>#{ticket.ticketId.toLocaleString()}</strong> (
					{ticket.ticketCode}) was voided before the draw — e.g., due to a
					chargeback or policy violation. It was not eligible for winner
					selection.
				</p>
			) : (
				<>
					<p>
						Entry <strong>#{ticket.ticketId.toLocaleString()}</strong> (
						{ticket.ticketCode})
						{totalTickets ? (
							<>
								{' '}
								— one of <strong>{totalTickets.toLocaleString()}</strong>{' '}
								eligible entries
							</>
						) : null}
						{raffleTitle ? <> in &ldquo;{raffleTitle}&rdquo;</> : null} locked
						on IPFS before the draw.
					</p>
					{/*
					 * Inline IPFS link so users can visually confirm step 1 on the
					 * public ledger — step 2 (Merkle) also links the manifest but
					 * users may stop reading before reaching it.
					 */}
					{manifestHash ? (
						<a
							href={getIpfsUrl(manifestHash)}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
						>
							See the eligible entry list on IPFS
							<ExternalLink className="size-3" />
						</a>
					) : null}
					{/*
					 * Privacy reinforcement — the lookup we just performed works off
					 * a one-way SHA-256 identity commitment, not raw PII. Reinforcing
					 * this at the moment the user sees their ticket was "found" closes
					 * the loop with the Privacy section on /how-it-works and answers
					 * the "but how did you find me without knowing who I am?" question
					 * before it's asked.
					 */}
					<div className="mt-3 flex items-start gap-1.5 text-xs">
						<ShieldCheck className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
						<span className="text-muted-foreground">
							Your name, email, and account never touch IPFS — only a one-way
							identity commitment does.
						</span>
					</div>
				</>
			)}
		</StoryStep>
	);
}

interface MerkleStepProps {
	proof: MerkleProof | null;
	raffle: RaffleVerificationPayload | null;
}

function MerkleStep({ proof, raffle }: MerkleStepProps) {
	/**
	 * Status logic:
	 * - proof verified → success
	 * - proof exists but invalid → error (potential integrity issue)
	 * - no proof data → neutral (data not available, not necessarily bad)
	 */
	function resolveStatus(): StoryStepStatus {
		if (!proof) return 'neutral';
		return proof.merkleVerified ? 'success' : 'error';
	}

	// Extract message to avoid nested ternary in JSX
	function resolveMessage(): string {
		if (!proof) return 'Merkle proof data is not available for this entry.';
		if (proof.merkleVerified)
			return "Your entry's hash traces to the Merkle root stored on-chain. It was locked before any randomness existed.";
		return 'Merkle proof could not be verified. This may indicate an issue.';
	}

	return (
		<StoryStep
			number={2}
			title="Cryptographically verified"
			status={resolveStatus()}
		>
			<p>{resolveMessage()}</p>

			{proof ? <MerkleProofDisplay proof={proof} className="mt-3" /> : null}

			{/* Link to the IPFS manifest — lets tech users inspect the committed data */}
			{raffle?.manifestHash ? (
				<a
					href={getIpfsUrl(raffle.manifestHash)}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
				>
					View manifest on IPFS
					<ExternalLink className="size-3" />
				</a>
			) : null}
		</StoryStep>
	);
}

interface DrawResultStepProps {
	ticket: TicketVerification;
	drawFormula: WinnerVerification | null;
	raffle: RaffleVerificationPayload | null;
}

function DrawResultStep({ ticket, drawFormula, raffle }: DrawResultStepProps) {
	// No formula data available — draw data still processing or API error
	if (!drawFormula) {
		return (
			<StoryStep number={3} title="The draw" status="neutral">
				<p>Winner selection data is being processed. Check back shortly.</p>
			</StoryStep>
		);
	}

	// This entry IS the winner — show congratulations + their formula
	if (ticket.isWinner) {
		const positionLabel = formatWinnerPosition(
			ticket.winnerPosition ?? 0,
			raffle?.winners.length ?? 0,
		);
		const title = positionLabel ? `Winner — ${positionLabel}` : 'Winner';
		return (
			<StoryStep number={3} title={title} status="success">
				<div className="flex flex-col gap-3">
					<p className="font-medium text-green-700">
						Your entry was selected by the random number.
					</p>
					<FormulaDisplay formula={drawFormula} variant="winner" />
					<BlockchainLinks raffle={raffle} />
				</div>
			</StoryStep>
		);
	}

	// Not a winner — explain the modulo math clearly so the user understands
	// *why* their entry wasn't picked: the random number simply landed elsewhere.
	return (
		<StoryStep number={3} title="The draw" status="neutral">
			<div className="flex flex-col gap-3">
				<p>
					Your entry <strong>#{ticket.ticketId.toLocaleString()}</strong> was in
					the pool and fully eligible. Here&apos;s the math that picked the
					winner:
				</p>
				<FormulaDisplay formula={drawFormula} variant="default" />
				{/*
				 * Plain-language explanation of the modulo operation for non-tech users.
				 * "Why not my entry?" is the #1 question — answer it directly.
				 */}
				<p>
					The random number, divided by the total number of entries, left a
					remainder that pointed to entry{' '}
					<strong>#{drawFormula.actualTicketId.toLocaleString()}</strong> — not
					yours. Every entry had an equal chance; the math simply landed on a
					different number.
				</p>
				<BlockchainLinks raffle={raffle} />
			</div>
		</StoryStep>
	);
}
