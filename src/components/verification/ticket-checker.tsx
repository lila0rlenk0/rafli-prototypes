'use client';

import {
	AlertCircle,
	CheckCircle2,
	Loader2,
	Search,
	XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { verifyTicket } from '@/services/verification/verify-ticket';
import { VERIFICATION_ERROR_CODES } from '@/types/errors/verification-errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { TicketVerification } from '@/types/verification';

import { cn } from '@/lib/utils';

type VerificationResult =
	| { type: 'success'; data: TicketVerification }
	| { type: 'error'; message: string };

function getErrorMessage(code: VerificationErrorCode): string {
	switch (code) {
		case VERIFICATION_ERROR_CODES.TICKET_NOT_FOUND:
			return 'Ticket not found. Check your ticket code and try again.';
		case VERIFICATION_ERROR_CODES.RAFFLE_NOT_COMPLETED:
			return 'This raffle has not been drawn yet.';
		case 'validation_error':
			return 'Invalid response from server.';
		case 'network_error':
			return 'Network error. Check your connection.';
		default:
			return 'An error occurred. Please try again.';
	}
}

export function TicketChecker() {
	const [raffleSlug, setRaffleSlug] = useState('');
	const [ticketCode, setTicketCode] = useState('');
	const [result, setResult] = useState<VerificationResult | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleVerify(e: React.FormEvent) {
		e.preventDefault();

		if (!raffleSlug.trim() || !ticketCode.trim()) return;

		setLoading(true);
		setResult(null);

		const response = await verifyTicket(raffleSlug.trim(), ticketCode.trim());

		if (response.success) {
			setResult({ type: 'success', data: response.data });
		} else {
			setResult({ type: 'error', message: getErrorMessage(response.error) });
		}

		setLoading(false);
	}

	function handleReset() {
		setResult(null);
		setRaffleSlug('');
		setTicketCode('');
	}

	return (
		<div className="rounded-xl border border-black bg-white p-6">
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
							'flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
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
	data: TicketVerification;
	onReset: () => void;
}

function VerificationSuccess({ data, onReset }: VerificationSuccessProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 text-green-600">
				<CheckCircle2 className="size-5" />
				<span className="font-semibold">Ticket Verified</span>
			</div>

			<div className="space-y-3 rounded-lg bg-neutral-50 p-4">
				<VerificationRow label="Ticket ID" value={`#${data.ticketId}`} />
				<VerificationRow label="Ticket Code" value={data.ticketCode} mono />
				<VerificationRow
					label="Merkle Verified"
					value={
						<span
							className={cn(
								'flex items-center gap-1',
								data.merkleVerified ? 'text-green-600' : 'text-red-600',
							)}
						>
							{data.merkleVerified ? (
								<CheckCircle2 className="size-4" />
							) : (
								<XCircle className="size-4" />
							)}
							{data.merkleVerified ? 'Yes' : 'No'}
						</span>
					}
				/>
				<VerificationRow
					label="Status"
					value={
						<span
							className={cn(data.isVoided ? 'text-red-600' : 'text-green-600')}
						>
							{data.isVoided ? 'Voided' : 'Valid'}
						</span>
					}
				/>
				{data.isWinner ? (
					<VerificationRow
						label="Winner"
						value={
							<span className="flex items-center gap-1 text-amber-600">
								{`Position #${(data.winnerPosition ?? 0) + 1}`}
							</span>
						}
					/>
				) : null}
			</div>

			<button
				type="button"
				onClick={onReset}
				className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
			>
				Verify Another Ticket
			</button>
		</div>
	);
}

interface VerificationErrorProps {
	message: string;
	onReset: () => void;
}

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

function VerificationRow({ label, value, mono }: VerificationRowProps) {
	return (
		<div className="flex items-center justify-between text-sm">
			<span className="text-neutral-500">{label}</span>
			<span className={cn(mono && 'font-mono text-xs')}>{value}</span>
		</div>
	);
}
