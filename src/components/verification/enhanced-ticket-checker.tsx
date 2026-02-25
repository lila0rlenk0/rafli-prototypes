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
import { cn } from '@/lib/utils';
import { getMerkleProof } from '@/services/verification/get-merkle-proof';
import { verifyTicket } from '@/services/verification/verify-ticket';
import { VERIFICATION_ERROR_CODES } from '@/types/errors/verification-errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { MerkleProof, TicketVerification } from '@/types/verification';

interface VerificationResult {
	ticket: TicketVerification;
	proof: MerkleProof | null;
}

type ResultState =
	| { type: 'success'; data: VerificationResult }
	| { type: 'error'; message: string };

/**
 * Gets user-friendly error message from verification error code
 */
function getErrorMessage(code: VerificationErrorCode): string {
	switch (code) {
		case VERIFICATION_ERROR_CODES.TICKET_NOT_FOUND:
			return 'Ticket not found. Check your ticket code and try again.';
		case VERIFICATION_ERROR_CODES.RAFFLE_NOT_COMPLETED:
			return 'This raffle has not been drawn yet.';
		case VERIFICATION_ERROR_CODES.PROOF_NOT_FOUND:
			return 'Merkle proof not available for this ticket.';
		case 'validation_error':
			return 'Invalid response from server.';
		case 'network_error':
			return 'Network error. Check your connection.';
		default:
			return 'An error occurred. Please try again.';
	}
}

/**
 * EnhancedTicketChecker Component
 *
 * Extended ticket verification with Merkle proof display.
 */
export function EnhancedTicketChecker() {
	const [raffleSlug, setRaffleSlug] = useState('');
	const [ticketCode, setTicketCode] = useState('');
	const [result, setResult] = useState<ResultState | null>(null);
	const [loading, setLoading] = useState(false);

	/**
	 * Handles verification form submission
	 */
	async function handleVerify(e: React.FormEvent) {
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
		let proof: MerkleProof | null = null;

		const proofResponse = await getMerkleProof(
			ticket.raffleId,
			ticket.ticketId,
		);
		if (proofResponse.success) {
			proof = proofResponse.data;
		}

		setResult({ type: 'success', data: { ticket, proof } });
		setLoading(false);
	}

	/**
	 * Resets the form to initial state
	 */
	function handleReset() {
		setResult(null);
		setRaffleSlug('');
		setTicketCode('');
	}

	return (
		<div className="rounded-2xl border border-black bg-white p-6 shadow-sm">
			<div className="mb-4 flex items-center gap-2">
				<Search className="size-5 text-neutral-900" />
				<h3 className="text-lg font-semibold">Verify Your Ticket</h3>
			</div>

			{!result ? (
				<form onSubmit={handleVerify} className="space-y-4">
					<div>
						<label
							htmlFor="raffleSlug"
							className="mb-1 block text-sm font-medium text-neutral-700"
						>
							Raffle ID or Slug
						</label>
						<input
							id="raffleSlug"
							type="text"
							value={raffleSlug}
							onChange={e => setRaffleSlug(e.target.value)}
							placeholder="e.g., my-raffle or raffle_abc123"
							className="w-full rounded-lg border border-[#E5E5E5] px-4 py-2.5 text-sm transition-colors focus:border-black focus:ring-1 focus:ring-black/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							disabled={loading}
						/>
					</div>

					<div>
						<label
							htmlFor="ticketCode"
							className="mb-1 block text-sm font-medium text-neutral-700"
						>
							Ticket Code
						</label>
						<input
							id="ticketCode"
							type="text"
							value={ticketCode}
							onChange={e => setTicketCode(e.target.value)}
							placeholder="e.g., TKT-1234-ABCDEF"
							className="w-full rounded-lg border border-[#E5E5E5] px-4 py-2.5 text-sm transition-colors focus:border-black focus:ring-1 focus:ring-black/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
								Verify Ticket
							</>
						)}
					</button>
				</form>
			) : result.type === 'success' ? (
				<VerificationSuccess data={result.data} onReset={handleReset} />
			) : (
				<VerificationError message={result.message} onReset={handleReset} />
			)}
		</div>
	);
}

interface VerificationSuccessProps {
	data: VerificationResult;
	onReset: () => void;
}

/**
 * Displays successful verification result with Merkle proof
 */
function VerificationSuccess({ data, onReset }: VerificationSuccessProps) {
	const { ticket, proof } = data;

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 text-green-600">
				<CheckCircle2 className="size-5" />
				<span className="font-semibold">Ticket Verified</span>
			</div>

			<div className="space-y-3 rounded-lg bg-neutral-50 p-4">
				<VerificationRow label="Ticket ID" value={`#${ticket.ticketId}`} />
				<VerificationRow label="Ticket Code" value={ticket.ticketCode} mono />
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
				{ticket.isWinner && (
					<VerificationRow
						label="Winner"
						value={
							<span className="flex items-center gap-1 text-amber-600">
								Position #{(ticket.winnerPosition ?? 0) + 1}
							</span>
						}
					/>
				)}
			</div>

			{proof && <MerkleProofDisplay proof={proof} />}

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

/**
 * Displays verification error
 */
function VerificationError({ message, onReset }: VerificationErrorProps) {
	return (
		<div className="space-y-4">
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

/**
 * Row in verification result
 */
function VerificationRow({ label, value, mono }: VerificationRowProps) {
	return (
		<div className="flex items-center justify-between text-sm">
			<span className="text-neutral-500">{label}</span>
			<span className={cn(mono && 'font-mono text-xs')}>{value}</span>
		</div>
	);
}
