'use client';

import {
	AlertCircle,
	CheckCircle2,
	ExternalLink,
	Loader2,
	Trophy,
	XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';
import { getVrfContractUrl } from '@/lib/verification-links';
import { verifyWinner } from '@/services/verification/verify-winner';
import { VERIFICATION_ERROR_CODES } from '@/types/errors/verification-errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { WinnerVerification } from '@/types/verification';

type ResultState =
	| { type: 'success'; data: WinnerVerification }
	| { type: 'error'; message: string };

/**
 * Gets user-friendly error message from verification error code
 */
function getErrorMessage(code: VerificationErrorCode): string {
	switch (code) {
		case VERIFICATION_ERROR_CODES.WINNER_NOT_FOUND:
			return 'Winner not found. Check the raffle ID and position.';
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

/**
 * WinnerLookup Component
 *
 * Allows verification of any winner by raffle ID and position.
 */
export function WinnerLookup() {
	const [raffleId, setRaffleId] = useState('');
	const [position, setPosition] = useState('1');
	const [result, setResult] = useState<ResultState | null>(null);
	const [loading, setLoading] = useState(false);

	/**
	 * Handles lookup form submission
	 */
	async function handleLookup(e: React.FormEvent) {
		e.preventDefault();

		const posNum = parseInt(position, 10);
		if (!raffleId.trim() || isNaN(posNum) || posNum < 1) return;

		setLoading(true);
		setResult(null);

		const response = await verifyWinner(raffleId.trim(), posNum);

		if (response.success) {
			setResult({ type: 'success', data: response.data });
		} else {
			setResult({ type: 'error', message: getErrorMessage(response.error) });
		}

		setLoading(false);
	}

	/**
	 * Resets the form to initial state
	 */
	function handleReset() {
		setResult(null);
		setRaffleId('');
		setPosition('1');
	}

	return (
		<div className="rounded-2xl border border-black bg-white p-6 shadow-sm">
			<div className="mb-4 flex items-center gap-2">
				<Trophy className="size-5 text-amber-600" />
				<h3 className="text-lg font-semibold">Verify a Winner</h3>
			</div>

			{!result ? (
				<form onSubmit={handleLookup} className="space-y-4">
					<div>
						<label htmlFor="raffleId" className="mb-1 block text-sm font-medium text-neutral-700">
							Raffle ID
						</label>
						<input
							id="raffleId"
							type="text"
							value={raffleId}
							onChange={(e) => setRaffleId(e.target.value)}
							placeholder="e.g., raffle_abc123"
							className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={loading}
						/>
					</div>

					<div>
						<label htmlFor="position" className="mb-1 block text-sm font-medium text-neutral-700">
							Winner Position
						</label>
						<input
							id="position"
							type="number"
							min="1"
							value={position}
							onChange={(e) => setPosition(e.target.value)}
							placeholder="e.g., 1"
							className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={loading}
						/>
					</div>

					<button
						type="submit"
						disabled={loading || !raffleId.trim() || !position.trim()}
						className={cn(
							'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors',
							loading || !raffleId.trim() || !position.trim()
								? 'cursor-not-allowed bg-neutral-300'
								: 'bg-amber-600 hover:bg-amber-700',
						)}
					>
						{loading ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Looking up...
							</>
						) : (
							<>
								<Trophy className="size-4" />
								Verify Winner
							</>
						)}
					</button>
				</form>
			) : result.type === 'success' ? (
				<WinnerSuccess data={result.data} raffleId={raffleId} onReset={handleReset} />
			) : (
				<LookupError message={result.message} onReset={handleReset} />
			)}
		</div>
	);
}

interface WinnerSuccessProps {
	data: WinnerVerification;
	raffleId: string;
	onReset: () => void;
}

/**
 * Displays successful winner verification result
 */
function WinnerSuccess({ data, raffleId, onReset }: WinnerSuccessProps) {
	/**
	 * Truncates a hex string for display
	 */
	function truncateHex(str: string): string {
		if (str.length <= 16) return str;
		return `${str.slice(0, 10)}...${str.slice(-8)}`;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 text-amber-600">
				<Trophy className="size-5" />
				<span className="font-semibold">Winner #{data.position} Verified</span>
			</div>

			<div className="space-y-3 rounded-lg bg-neutral-50 p-4">
				<WinnerRow label="Winning Ticket" value={`#${data.actualTicketId}`} />
				<WinnerRow label="Ticket Code" value={data.ticketCode} mono />
				<WinnerRow
					label="Merkle Verified"
					value={
						<span className={cn('flex items-center gap-1', data.merkleVerified ? 'text-green-600' : 'text-red-600')}>
							{data.merkleVerified ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
							{data.merkleVerified ? 'Yes' : 'No'}
						</span>
					}
				/>
				<WinnerRow
					label="Computed vs Actual"
					value={
						<span className={cn('flex items-center gap-1', data.computedTicketId === data.actualTicketId ? 'text-green-600' : 'text-red-600')}>
							{data.computedTicketId === data.actualTicketId ? (
								<CheckCircle2 className="size-4" />
							) : (
								<XCircle className="size-4" />
							)}
							{data.computedTicketId === data.actualTicketId ? 'Match' : 'Mismatch'}
						</span>
					}
				/>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-xs text-neutral-500">Random Number</span>
					<CopyButton value={data.randomNumber} />
				</div>
				<div className="rounded bg-neutral-100 px-2 py-1.5">
					<code className="block font-mono text-[11px] break-all" title={data.randomNumber}>
						{truncateHex(data.randomNumber)}
					</code>
				</div>
			</div>

			<div className="space-y-2">
				<span className="text-xs text-neutral-500">Selection Formula</span>
				<div className="rounded bg-neutral-100 px-2 py-1.5">
					<code className="block font-mono text-[11px] break-all">
						{data.formula}
					</code>
				</div>
			</div>

			<a
				href={getVrfContractUrl()}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100"
			>
				VRF Contract
				<ExternalLink className="size-3" />
			</a>

			<div className="flex flex-col gap-2 sm:flex-row">
				<button
					type="button"
					onClick={onReset}
					className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
				>
					Verify Another
				</button>
				<Link
					href={`/verify/${raffleId}`}
					className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-800"
				>
					View Full Details
				</Link>
			</div>
		</div>
	);
}

interface LookupErrorProps {
	message: string;
	onReset: () => void;
}

/**
 * Displays lookup error
 */
function LookupError({ message, onReset }: LookupErrorProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 text-red-600">
				<AlertCircle className="size-5" />
				<span className="font-semibold">Lookup Failed</span>
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

interface WinnerRowProps {
	label: string;
	value: React.ReactNode;
	mono?: boolean;
}

/**
 * Row in winner result
 */
function WinnerRow({ label, value, mono }: WinnerRowProps) {
	return (
		<div className="flex items-center justify-between text-sm">
			<span className="text-neutral-500">{label}</span>
			<span className={cn(mono && 'font-mono text-xs')}>{value}</span>
		</div>
	);
}
