'use client';

import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getTxExplorerUrl } from '@/lib/web3/format/block-explorers';
import type { CryptoChainConfig } from '@/types/crypto-config';

interface TxLinkProps {
	txHash: string | undefined;
	selectedChainId: number | undefined;
	/** Chain configs from crypto config endpoint — needed for explorer URL resolution */
	chains: CryptoChainConfig[];
}

/** Block explorer link for the submitted tx hash — reused across confirming, success, and failure. */
export function TxLink({ txHash, selectedChainId, chains }: TxLinkProps) {
	const url = getTxExplorerUrl(txHash, selectedChainId, chains);
	if (!txHash || !url) return null;

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="text-ink-500 flex items-center gap-1 text-xs underline transition-colors hover:text-black"
		>
			View transaction
			<ExternalLink className="size-3" />
		</a>
	);
}

interface SuccessStepProps {
	txHash: string | undefined;
	selectedChainId: number;
	/** Chain configs for explorer URL resolution */
	chains: CryptoChainConfig[];
	onClose: () => void;
}

export function SuccessStep({
	txHash,
	selectedChainId,
	chains,
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
				<p className="text-ink-500 text-center text-sm">
					Your entries will appear below shortly — it may take 1-2 minutes.
				</p>
			</div>
			<TxLink
				txHash={txHash}
				selectedChainId={selectedChainId}
				chains={chains}
			/>
			<Button
				onClick={onClose}
				className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				Done
			</Button>
		</div>
	);
}

interface FailureStepProps {
	txHash: string | undefined;
	/** May be undefined if failure occurs before chain selection (e.g. expired session on reopen) */
	selectedChainId: number | undefined;
	/** Chain configs for explorer URL resolution */
	chains: CryptoChainConfig[];
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
 * "Try Again" hidden when `fundsAtRisk` (reorg + ambiguous balance) — retrying could double-pay.
 */
export function FailureStep({
	txHash,
	selectedChainId,
	chains,
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
			<TxLink
				txHash={txHash}
				selectedChainId={selectedChainId}
				chains={chains}
			/>
			<div className="flex w-full gap-2">
				<Button
					variant="outline"
					onClick={onClose}
					className="h-12 flex-1 border-2 border-black bg-white hover:bg-black hover:text-white"
				>
					Close
				</Button>
				{!hideRetry ? (
					<Button
						onClick={onReset}
						className="h-12 flex-1 border-2 border-black bg-black hover:bg-white hover:text-black"
					>
						Try Again
					</Button>
				) : null}
			</div>
		</div>
	);
}
