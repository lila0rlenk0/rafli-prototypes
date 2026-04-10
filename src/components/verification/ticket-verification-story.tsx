'use client';

import {
	AlertCircle,
	CheckCircle2,
	ExternalLink,
	Loader2,
	Search,
	XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { CopyButton } from '@/components/ui/copy-button';
import { MerkleProofDisplay } from '@/components/verification/merkle-proof-display';
import { cn } from '@/lib/utils';
import {
	getArbiscanTxUrl,
	getIpfsUrl,
	getVrfContractUrl,
} from '@/lib/verification-links';
import { getMerkleProof } from '@/services/verification/get-merkle-proof';
import { getRaffleVerification } from '@/services/verification/get-raffle-verification';
import { verifyTicket } from '@/services/verification/verify-ticket';
import { verifyWinner } from '@/services/verification/verify-winner';
import { VERIFICATION_ERROR_CODES } from '@/types/errors/verification-errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type {
	MerkleProof,
	RaffleVerificationData,
	TicketVerification,
	WinnerVerification,
} from '@/types/verification';

// --- Types ---

/** Aggregated data from all verification API calls */
interface StoryData {
	ticket: TicketVerification;
	proof: MerkleProof | null;
	raffle: RaffleVerificationData | null;
	/**
	 * Winner formula — for the ticket's own position (if winner)
	 * or 1st place / position 0 (if not winner), to show the math.
	 */
	drawFormula: WinnerVerification | null;
}

/** Phase-based state machine for the verification flow */
type State =
	| { phase: 'form' }
	| { phase: 'loading' }
	| { phase: 'result'; data: StoryData }
	| { phase: 'error'; message: string };

// --- Helpers ---

/**
 * Maps verification error codes to user-friendly messages.
 * @returns Human-readable error description
 */
function getErrorMessage(code: VerificationErrorCode): string {
	switch (code) {
		case VERIFICATION_ERROR_CODES.TICKET_NOT_FOUND:
			return 'Ticket not found. Double-check your ticket code and raffle ID.';
		case VERIFICATION_ERROR_CODES.RAFFLE_NOT_COMPLETED:
			return "This raffle hasn't been drawn yet. Verification is available after the draw.";
		case VERIFICATION_ERROR_CODES.PROOF_NOT_FOUND:
			return 'Merkle proof not available for this ticket.';
		case 'validation_error':
			return 'Unexpected response from the server.';
		case 'network_error':
			return 'Network error. Check your connection and try again.';
		default:
			return 'Something went wrong. Please try again.';
	}
}

/**
 * Truncates long hex/number strings for display.
 * Preserves start and end for recognizability.
 * @returns Truncated string like "10566577...397731"
 */
function truncateHash(value: string, maxLength = 24): string {
	if (value.length <= maxLength) return value;
	// Keep enough characters on each side for visual recognition
	const keep = Math.floor((maxLength - 3) / 2);
	return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

// --- Main Component ---

/**
 * TicketVerificationStory
 *
 * Interactive verification component that tells the full story of a ticket's
 * participation in a raffle draw. Shows 3 steps:
 * 1. Found in the committed set (IPFS ledger)
 * 2. Cryptographically verified (Merkle proof)
 * 3. Draw result (formula math — who won and why)
 *
 * For non-winners, step 3 shows the exact math that selected a different ticket.
 * For winners, step 3 shows the math that selected their ticket.
 */
export function TicketVerificationStory() {
	const [raffleSlug, setRaffleSlug] = useState('');
	const [ticketCode, setTicketCode] = useState('');
	const [state, setState] = useState<State>({ phase: 'form' });

	/**
	 * Verification flow:
	 * 1. Verify ticket exists (required — fail fast if not found)
	 * 2. Fetch merkle proof, raffle data, winner formula in parallel (best-effort)
	 *
	 * For non-winners, we fetch position 0 (1st place) to show the formula.
	 * For winners, we fetch their specific position's formula.
	 */
	async function handleVerify(e: React.FormEvent) {
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
				message: getErrorMessage(ticketResponse.error),
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

	// Render based on current phase
	switch (state.phase) {
		case 'form':
			return (
				<VerificationForm
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
						Verifying your ticket...
					</p>
				</div>
			);
		case 'result':
			return <StoryResult data={state.data} onReset={handleReset} />;
		case 'error':
			return <StoryError message={state.message} onReset={handleReset} />;
	}
}

// --- Form ---

interface VerificationFormProps {
	raffleSlug: string;
	ticketCode: string;
	onRaffleSlugChange: (value: string) => void;
	onTicketCodeChange: (value: string) => void;
	onSubmit: (e: React.FormEvent) => void;
}

function VerificationForm({
	raffleSlug,
	ticketCode,
	onRaffleSlugChange,
	onTicketCodeChange,
	onSubmit,
}: VerificationFormProps) {
	const canSubmit =
		raffleSlug.trim().length > 0 && ticketCode.trim().length > 0;

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<label htmlFor="hiw-raffle" className="mb-1 block text-sm font-medium">
					Raffle ID or Slug
				</label>
				<input
					id="hiw-raffle"
					type="text"
					value={raffleSlug}
					onChange={e => onRaffleSlugChange(e.target.value)}
					placeholder="e.g., my-raffle or raffle_abc123"
					className="border-input focus:border-ring focus:ring-ring/50 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none"
				/>
				{/* Hint: slug is the last segment of the raffle URL */}
				<p className="text-muted-foreground mt-1 text-xs">
					Found in the raffle&apos;s URL
				</p>
			</div>

			<div>
				<label htmlFor="hiw-ticket" className="mb-1 block text-sm font-medium">
					Ticket Code
				</label>
				<input
					id="hiw-ticket"
					type="text"
					value={ticketCode}
					onChange={e => onTicketCodeChange(e.target.value)}
					placeholder="e.g., TKT-1234-ABCDEF"
					className="border-input focus:border-ring focus:ring-ring/50 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none"
				/>
			</div>

			{/*
			 * Both enabled/disabled states share bg-primary — only the hover
			 * affordance and disabled styling diverge. Collapsed to a base
			 * class + single conditional to avoid duplicating bg-primary.
			 */}
			<button
				type="submit"
				disabled={!canSubmit}
				className={cn(
					'bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
					canSubmit ? 'hover:bg-primary/90' : 'cursor-not-allowed opacity-50',
				)}
			>
				<Search className="size-4" />
				Verify Ticket
			</button>
		</form>
	);
}

// --- Result ---

interface StoryResultProps {
	data: StoryData;
	onReset: () => void;
}

/**
 * Renders the 3-step verification story after a successful ticket lookup.
 * Steps degrade gracefully — missing merkle/raffle/formula data is handled.
 */
function StoryResult({ data, onReset }: StoryResultProps) {
	const { ticket, proof, raffle, drawFormula } = data;

	return (
		<div className="space-y-3">
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
					className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors"
				>
					View Full Details
				</Link>
			</div>
		</div>
	);
}

// --- Step 1: Found ---

interface FoundStepProps {
	ticket: TicketVerification;
	raffle: RaffleVerificationData | null;
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
					Ticket <strong>#{ticket.ticketId.toLocaleString()}</strong> (
					{ticket.ticketCode}) was voided before the draw — e.g., due to a
					chargeback or policy violation. It was not eligible for winner
					selection.
				</p>
			) : (
				<>
					<p>
						Ticket <strong>#{ticket.ticketId.toLocaleString()}</strong> (
						{ticket.ticketCode})
						{totalTickets ? (
							<>
								{' '}
								— one of <strong>{totalTickets.toLocaleString()}</strong>{' '}
								eligible tickets
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
							See the eligible ticket list on IPFS
							<ExternalLink className="size-3" />
						</a>
					) : null}
				</>
			)}
		</StoryStep>
	);
}

// --- Step 2: Merkle ---

interface MerkleStepProps {
	proof: MerkleProof | null;
	raffle: RaffleVerificationData | null;
}

function MerkleStep({ proof, raffle }: MerkleStepProps) {
	/**
	 * Status logic:
	 * - proof verified → success
	 * - proof exists but invalid → error (potential integrity issue)
	 * - no proof data → neutral (data not available, not necessarily bad)
	 */
	function resolveStatus(): StepStatus {
		if (!proof) return 'neutral';
		return proof.merkleVerified ? 'success' : 'error';
	}

	// Extract message to avoid nested ternary in JSX
	function resolveMessage(): string {
		if (!proof) return 'Merkle proof data is not available for this ticket.';
		if (proof.merkleVerified)
			return "Your ticket's hash traces to the Merkle root stored on-chain. It was locked before any randomness existed.";
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

// --- Step 3: Draw Result ---

interface DrawResultStepProps {
	ticket: TicketVerification;
	drawFormula: WinnerVerification | null;
	raffle: RaffleVerificationData | null;
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

	// This ticket IS the winner — show congratulations + their formula
	if (ticket.isWinner) {
		return (
			<StoryStep
				number={3}
				title={`Winner — Position #${(ticket.winnerPosition ?? 0) + 1}`}
				status="success"
			>
				<div className="space-y-3">
					<p className="font-medium text-green-700">
						Your ticket was selected by the random number.
					</p>
					<FormulaDisplay formula={drawFormula} variant="winner" />
					<BlockchainLinks raffle={raffle} />
				</div>
			</StoryStep>
		);
	}

	// Not a winner — show the math that selected a different ticket
	return (
		<StoryStep number={3} title="The draw" status="neutral">
			<div className="space-y-3">
				<FormulaDisplay formula={drawFormula} variant="default" />
				<p>
					Your ticket <strong>#{ticket.ticketId.toLocaleString()}</strong> was
					eligible. The random number selected ticket{' '}
					<strong>#{drawFormula.actualTicketId.toLocaleString()}</strong>.
				</p>
				<BlockchainLinks raffle={raffle} />
			</div>
		</StoryStep>
	);
}

// --- Formula Display ---

interface FormulaDisplayProps {
	formula: WinnerVerification;
	variant: 'default' | 'winner';
}

/**
 * Shows the VRF random number and modulo formula in a compact, readable format.
 * Highlights the result differently for winners vs non-winners.
 */
function FormulaDisplay({ formula, variant }: FormulaDisplayProps) {
	const bgClass = variant === 'winner' ? 'bg-green-50' : 'bg-muted';

	return (
		<div className={cn('rounded-lg p-3', bgClass)}>
			<div className="space-y-1.5 text-sm">
				{/* Random number — the raw VRF output */}
				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground">Random number</span>
					<div className="flex items-center gap-1">
						<code className="font-mono text-xs">
							{truncateHash(formula.randomNumber)}
						</code>
						<CopyButton value={formula.randomNumber} />
					</div>
				</div>

				{/* Formula — shows the full modulo expression */}
				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground">Formula</span>
					<code className="font-mono text-xs">{formula.formula}</code>
				</div>

				{/* Result — the winning ticket ID */}
				<div className="border-border flex items-center justify-between gap-2 border-t pt-1.5">
					<span className="text-muted-foreground">Result</span>
					<span
						className={cn(
							'font-semibold',
							variant === 'winner' ? 'text-green-700' : '',
						)}
					>
						Ticket #{formula.actualTicketId.toLocaleString()}
						{variant === 'winner' ? ' — yours' : null}
					</span>
				</div>

				{/*
				 * Skip adjustment indicator — when computed differs from actual,
				 * the original ticket was voided or belonged to a duplicate user,
				 * so the algorithm skipped forward to the next valid ticket.
				 */}
				{formula.computedTicketId !== formula.actualTicketId ? (
					<div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
						<span>Raw result</span>
						<span>
							#{formula.computedTicketId.toLocaleString()} (skipped — voided or
							duplicate)
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}

// --- Blockchain Links ---

interface BlockchainLinksProps {
	raffle: RaffleVerificationData | null;
}

/** External links to Arbiscan for VRF transaction and contract verification */
function BlockchainLinks({ raffle }: BlockchainLinksProps) {
	return (
		<div className="flex flex-wrap gap-3">
			{raffle?.vrfFulfillTxHash ? (
				<a
					href={getArbiscanTxUrl(raffle.vrfFulfillTxHash)}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
				>
					VRF transaction
					<ExternalLink className="size-3" />
				</a>
			) : null}
			<a
				href={getVrfContractUrl()}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
			>
				VRF contract
				<ExternalLink className="size-3" />
			</a>
		</div>
	);
}

// --- Shared Sub-Components ---

type StepStatus = 'success' | 'error' | 'warning' | 'neutral';

interface StoryStepProps {
	number: number;
	title: string;
	status: StepStatus;
	children: React.ReactNode;
}

/**
 * A single step in the verification story timeline.
 * Number badge on the left, title + status icon on the right, content below.
 */
function StoryStep({ number, title, status, children }: StoryStepProps) {
	return (
		<div className="bg-card rounded-lg border p-4">
			<div className="mb-2 flex items-center gap-3">
				<span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
					{number}
				</span>
				<h4 className="flex-1 text-sm font-semibold">{title}</h4>
				<StepStatusIcon status={status} />
			</div>
			<div className="text-muted-foreground ml-9 text-sm">{children}</div>
		</div>
	);
}

interface StepStatusIconProps {
	status: StepStatus;
}

/** Visual status indicator for each story step */
function StepStatusIcon({ status }: StepStatusIconProps) {
	switch (status) {
		case 'success':
			return <CheckCircle2 className="size-4 shrink-0 text-green-600" />;
		case 'error':
			return <XCircle className="size-4 shrink-0 text-red-600" />;
		case 'warning':
			return <AlertCircle className="size-4 shrink-0 text-amber-600" />;
		case 'neutral':
			return null;
		default: {
			const _exhaustive: never = status;
			return _exhaustive;
		}
	}
}

interface StoryErrorProps {
	message: string;
	onReset: () => void;
}

/** Error state — shown when the ticket verification call fails */
function StoryError({ message, onReset }: StoryErrorProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 text-red-600">
				<AlertCircle className="size-5" />
				<span className="font-semibold">Verification Failed</span>
			</div>
			<p className="text-muted-foreground text-sm">{message}</p>
			<button
				type="button"
				onClick={onReset}
				className="border-border hover:bg-muted w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
			>
				Try Again
			</button>
		</div>
	);
}
