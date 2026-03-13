'use client';

import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getTxExplorerUrl } from '@/lib/web3/block-explorers';

// ==========================================
// Shared: TxLink
// ==========================================

interface TxLinkProps {
	txHash: string | undefined;
	selectedChainId: number | undefined;
}

/**
 * Block explorer link for the submitted transaction hash.
 * Reused across confirming, success, and failure steps.
 */
export function TxLink({ txHash, selectedChainId }: TxLinkProps) {
	const url = getTxExplorerUrl(txHash, selectedChainId);
	if (!txHash || !url) return null;

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="flex items-center gap-1 text-xs text-[#7B7B7B] underline transition-colors hover:text-black"
		>
			View transaction
			<ExternalLink className="size-3" />
		</a>
	);
}

// ==========================================
// SuccessStep
// ==========================================

interface SuccessStepProps {
	txHash: string | undefined;
	selectedChainId: number;
	onClose: () => void;
}

/**
 * Terminal success step — payment confirmed on-chain and verified by backend.
 */
export function SuccessStep({
	txHash,
	selectedChainId,
	onClose,
}: SuccessStepProps) {
	return (
		<div className="flex flex-col items-center gap-5 py-6">
			<div className="flex size-14 items-center justify-center rounded-full bg-green-50">
				<CheckCircle2 className="size-8 text-green-500" />
			</div>
			<div className="flex flex-col items-center gap-1">
				<p className="font-clash-display text-lg font-semibold">
					Payment confirmed!
				</p>
				<p className="text-center text-sm text-[#7B7B7B]">
					Your tickets will appear below shortly — it may take 1-2 minutes.
				</p>
			</div>
			<TxLink txHash={txHash} selectedChainId={selectedChainId} />
			<Button
				onClick={onClose}
				className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				Done
			</Button>
		</div>
	);
}

// ==========================================
// FailureStep
// ==========================================

interface FailureStepProps {
	txHash: string | undefined;
	/** May be undefined if failure occurs before chain selection (e.g. expired session on reopen) */
	selectedChainId: number | undefined;
	errorMessage: string | null;
	/** When true, funds may have been deducted — hides "Try Again" to prevent duplicate payment */
	fundsAtRisk?: boolean;
	/**
	 * Some failures are non-retryable even if funds are not definitely at risk.
	 * Example: wallet replaced/cancelled a tx after backend already registered a different hash.
	 */
	retryBlocked?: boolean;
	onClose: () => void;
	onReset: () => void;
}

/**
 * Terminal failure step — payment failed or verification timed out.
 * Offers retry via onReset and close via onClose.
 * "Try Again" is hidden when fundsAtRisk is true (reorg with ambiguous balance)
 * — retrying could cause a duplicate payment.
 */
export function FailureStep({
	txHash,
	selectedChainId,
	errorMessage,
	fundsAtRisk = false,
	retryBlocked = false,
	onClose,
	onReset,
}: FailureStepProps) {
	const hideRetry = fundsAtRisk || retryBlocked;

	return (
		<div className="flex flex-col items-center gap-5 py-6">
			<div className="flex size-14 items-center justify-center rounded-full bg-red-50">
				<XCircle className="size-8 text-red-500" />
			</div>
			<p className="text-center text-sm text-red-600">
				{errorMessage ?? 'Something went wrong.'}
			</p>
			<TxLink txHash={txHash} selectedChainId={selectedChainId} />
			<div className="flex w-full gap-2">
				<Button
					variant="outline"
					onClick={onClose}
					className="h-12 flex-1 border-2 border-black bg-white hover:bg-black hover:text-white"
				>
					Close
				</Button>
				{!hideRetry && (
					<Button
						onClick={onReset}
						className="h-12 flex-1 border-2 border-black bg-black hover:bg-white hover:text-black"
					>
						Try Again
					</Button>
				)}
			</div>
		</div>
	);
}
