'use client';

import {
	AlertCircle,
	CheckCircle2,
	Loader2,
	Search,
	XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { MerkleProofDisplay } from '@/components/verification/merkle-proof-display';
import { cn } from '@/lib/class-names';
import { formatWinnerPosition } from '@/lib/utils/raffle/winner-position';
import { getMerkleProof } from '@/services/verification/get-merkle-proof';
import { getRaffleVerification } from '@/services/verification/get-raffle-verification';
import { verifyTicket } from '@/services/verification/verify-ticket';
import { VERIFICATION_ERROR_CODES } from '@/types/errors/verification-errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { MerkleProof, TicketVerification } from '@/types/verification';

interface VerificationResult {
	ticket: TicketVerification;
	proof: MerkleProof | null;
	/** Total winners drawn — drives 1-based / suppressed position display. */
	totalWinners: number | null;
}

type ResultState =
	| { type: 'success'; data: VerificationResult }
	| { type: 'error'; message: string };

interface EnhancedTicketCheckerProps {
	/** Pre-fill the raffle field — comes from `?raffle=` query param on /verify */
	initialRaffleSlug?: string;
	/** Pre-fill the ticket code field — comes from `?code=` query param on /verify */
	initialTicketCode?: string;
}

function getErrorMessage(code: VerificationErrorCode): string {
	switch (code) {
		case VERIFICATION_ERROR_CODES.TICKET_NOT_FOUND:
			return 'Entry not found. Check your entry code and try again.';
		// Backend emits either `no-vrf-data` (VRF still pending) or
		// `not-completed` (status guard). Both map to the same user message.
		case VERIFICATION_ERROR_CODES.RAFFLE_NOT_COMPLETED:
		case VERIFICATION_ERROR_CODES.RAFFLE_NOT_COMPLETED_ALT:
			return 'This sweepstakes has not been drawn yet.';
		case VERIFICATION_ERROR_CODES.PROOF_NOT_FOUND:
			return 'Merkle proof not available for this entry.';
		case 'validation_error':
			return 'Invalid response from server.';
		case 'network_error':
			return 'Network error. Check your connection.';
		default:
			return 'An error occurred. Please try again.';
	}
}

export function EnhancedTicketChecker({
	initialRaffleSlug = '',
	initialTicketCode = '',
}: EnhancedTicketCheckerProps = {}) {
	// Seed state directly from props — server component reads searchParams and
	// passes them down, so the form is pre-filled on first render (no effect).
	// Empty-string fallback preserves the uncontrolled-input free-typing UX.
	const [raffleSlug, setRaffleSlug] = useState(initialRaffleSlug);
	const [ticketCode, setTicketCode] = useState(initialTicketCode);
	const [result, setResult] = useState<ResultState | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleVerify(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();

		if (!raffleSlug.trim() || !ticketCode.trim()) return;

		setLoading(true);
		setResult(null);

		const ticketResponse = await verifyTicket(
			raffleSlug.trim(),
			ticketCode.trim(),
		);

		if (!ticketResponse.success) {
			setResult({
				type: 'error',
				message: getErrorMessage(ticketResponse.error),
			});
			setLoading(false);
			return;
		}

		const ticket = ticketResponse.data;

		// Winner rows show a 1-based position, but single-winner raffles have no
		// ranking — fetch the winner count (only when this entry won) alongside
		// the proof so the position label can be suppressed for solo winners.
		const [proofResponse, raffleResponse] = await Promise.all([
			getMerkleProof(ticket.raffleId, ticket.ticketId),
			ticket.isWinner
				? getRaffleVerification(ticket.raffleId)
				: Promise.resolve(null),
		]);

		const proof = proofResponse.success ? proofResponse.data : null;
		let totalWinners: number | null = null;
		if (raffleResponse && raffleResponse.success) {
			totalWinners = raffleResponse.data.winners.length;
		}

		setResult({ type: 'success', data: { ticket, proof, totalWinners } });
		setLoading(false);
	}

	function handleReset() {
		setResult(null);
		setRaffleSlug('');
		setTicketCode('');
	}

	function renderResultBody() {
		if (!result) {
			return (
				<form onSubmit={handleVerify} className="flex flex-col gap-4">
					<div>
						<label
							htmlFor="raffleSlug"
							className="mb-1 block text-sm font-medium text-neutral-700"
						>
							Sweepstakes ID or Slug
						</label>
						<input
							id="raffleSlug"
							type="text"
							value={raffleSlug}
							onChange={e => setRaffleSlug(e.target.value)}
							placeholder="e.g., my-sweepstakes or sweepstakes_abc123"
							className="border-ink-200 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:border-black focus:ring-1 focus:ring-black/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							disabled={loading}
						/>
					</div>

					<div>
						<label
							htmlFor="ticketCode"
							className="mb-1 block text-sm font-medium text-neutral-700"
						>
							Entry Code
						</label>
						<input
							id="ticketCode"
							type="text"
							value={ticketCode}
							onChange={e => setTicketCode(e.target.value)}
							placeholder="e.g., TKT-1234-ABCDEF"
							className="border-ink-200 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:border-black focus:ring-1 focus:ring-black/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							disabled={loading}
						/>
					</div>

					<button
						type="submit"
						disabled={loading || !raffleSlug.trim() || !ticketCode.trim()}
						className={cn(
							'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
							loading || !raffleSlug.trim() || !ticketCode.trim()
								? 'cursor-not-allowed bg-black opacity-50'
								: 'bg-black hover:bg-neutral-800',
						)}
					>
						{loading ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Verifying...
							</>
						) : (
							<>
								<Search className="size-4" />
								Verify Entry
							</>
						)}
					</button>
				</form>
			);
		}
		if (result.type === 'success') {
			return <VerificationSuccess data={result.data} onReset={handleReset} />;
		}
		return <VerificationError message={result.message} onReset={handleReset} />;
	}

	return (
		<div className="rounded-2xl border border-black bg-white p-6 shadow-sm">
			<div className="mb-4 flex items-center gap-2">
				<Search className="size-5 text-neutral-900" />
				<h3 className="text-lg font-semibold">Verify Your Entry</h3>
			</div>

			{renderResultBody()}
		</div>
	);
}

interface VerificationSuccessProps {
	data: VerificationResult;
	onReset: () => void;
}

function VerificationSuccess({ data, onReset }: VerificationSuccessProps) {
	const { ticket, proof } = data;

	// 1-based position, suppressed for solo winners; "Winning entry" when the
	// position is suppressed or the winner count could not be loaded.
	function getWinnerLabel() {
		return (
			formatWinnerPosition(
				ticket.winnerPosition ?? 0,
				data.totalWinners ?? 0,
			) ?? 'Winning entry'
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2 text-green-600">
				<CheckCircle2 className="size-5" />
				<span className="font-semibold">Entry Verified</span>
			</div>

			<div className="flex flex-col gap-3 rounded-lg bg-neutral-50 p-4">
				<VerificationRow label="Entry ID" value={`#${ticket.ticketId}`} />
				<VerificationRow label="Entry Code" value={ticket.ticketCode} mono />
				<VerificationRow
					label="Merkle Verified"
					value={
						<span
							className={cn(
								'flex items-center gap-1',
								ticket.merkleVerified ? 'text-green-600' : 'text-red-600',
							)}
						>
							{ticket.merkleVerified ? (
								<CheckCircle2 className="size-4" />
							) : (
								<XCircle className="size-4" />
							)}
							{ticket.merkleVerified ? 'Yes' : 'No'}
						</span>
					}
				/>
				<VerificationRow
					label="Status"
					value={
						<span
							className={cn(
								ticket.isVoided ? 'text-red-600' : 'text-green-600',
							)}
						>
							{ticket.isVoided ? 'Voided' : 'Valid'}
						</span>
					}
				/>
				{ticket.isWinner ? (
					<VerificationRow
						label="Winner"
						value={
							<span className="flex items-center gap-1 text-amber-600">
								{getWinnerLabel()}
							</span>
						}
					/>
				) : null}
			</div>

			{proof ? <MerkleProofDisplay proof={proof} /> : null}

			<div className="flex flex-col gap-2 sm:flex-row">
				<button
					type="button"
					onClick={onReset}
					className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
				>
					Verify Another
				</button>
				<Link
					href={`/verify/${ticket.raffleId}`}
					className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-800"
				>
					View Full Details
				</Link>
			</div>
		</div>
	);
}

interface VerificationErrorProps {
	message: string;
	onReset: () => void;
}

function VerificationError({ message, onReset }: VerificationErrorProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2 text-red-600">
				<AlertCircle className="size-5" />
				<span className="font-semibold">Verification Failed</span>
			</div>

			<p className="text-sm text-neutral-600">{message}</p>

			<button
				type="button"
				onClick={onReset}
				className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
			>
				Try Again
			</button>
		</div>
	);
}

interface VerificationRowProps {
	label: string;
	value: React.ReactNode;
	mono?: boolean;
}

function VerificationRow({ label, value, mono }: VerificationRowProps) {
	return (
		<div className="flex items-center justify-between text-sm">
			<span className="text-neutral-500">{label}</span>
			<span className={cn(mono && 'font-mono text-xs')}>{value}</span>
		</div>
	);
}
