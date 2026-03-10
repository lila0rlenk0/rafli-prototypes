'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatPaymentAmount, formatTokenBalance } from '@/lib/web3/format';
import { CHAIN_NAMES, type CryptoCheckoutSession } from '@/types/wallet';

// ==========================================
// Types
// ==========================================

interface ReviewStepProps {
	session: CryptoCheckoutSession | null;
	/** Parent guarantees non-null — only renders when chain is selected */
	selectedChainId: number;
	isCorrectChain: boolean;
	/** Token balance from wagmi useBalance — undefined while loading */
	tokenBalance:
		| { value: bigint; decimals: number; symbol?: string }
		| undefined;
	/** True when token balance is still loading from chain */
	isTokenBalanceLoading: boolean;
	/** True when RPC call to fetch token balance failed */
	isTokenBalanceError?: boolean;
	isProcessing: boolean;
	/** True after writeContractAsync returns (Worker A's txSubmitted state) */
	txSubmitted?: boolean;
	onPay: () => void;
}

// ==========================================
// Component
// ==========================================

/**
 * Review & pay step for crypto checkout.
 * Shows payment summary (network, token, balance, amount) and Pay button.
 * Disables pay when balance insufficient or still loading.
 */
export function ReviewStep({
	session,
	selectedChainId,
	isCorrectChain,
	tokenBalance,
	isTokenBalanceLoading,
	isTokenBalanceError,
	isProcessing,
	txSubmitted,
	onPay,
}: ReviewStepProps) {
	/**
	 * Checks if user has enough USDC for the payment.
	 * Returns false when balance is still loading — prevents premature pay.
	 */
	function hasEnoughTokens(): boolean {
		if (isTokenBalanceLoading) return false;
		// If balance loaded but data is undefined (RPC error, unsupported token),
		// disable Pay — prevents confusing wallet-level failure after clicking Pay
		if (!tokenBalance || !session) return false;
		return tokenBalance.value >= BigInt(session.amountRaw);
	}

	/**
	 * Gets pay button text based on current state
	 */
	function getPayButtonText(): string {
		if (isProcessing || txSubmitted) return 'Processing...';
		if (isTokenBalanceLoading) return 'Checking balance...';
		return `Pay ${formatPaymentAmount(session)} USDC`;
	}

	/**
	 * Whether the pay button should be disabled.
	 * hasEnoughTokens() already returns false when balance is loading,
	 * so no need to check isTokenBalanceLoading separately.
	 */
	function isPayDisabled(): boolean {
		return isProcessing || !!txSubmitted || !hasEnoughTokens();
	}

	/**
	 * Text color for the balance row — red when insufficient, normal otherwise.
	 * isTokenBalanceLoading check avoids flashing red before balance arrives.
	 */
	function getBalanceTextClass(): string {
		if (isTokenBalanceLoading) return '';
		return !hasEnoughTokens() ? 'text-red-500' : '';
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Payment summary card */}
			<div className="rounded-2xl border border-[#E5E5E5] p-5">
				<div className="flex flex-col gap-3 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-[#7B7B7B]">Network</span>
						<span className="font-medium">
							{CHAIN_NAMES[selectedChainId] ?? `Chain ${selectedChainId}`}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[#7B7B7B]">Token</span>
						<span className="font-medium">USDC</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[#7B7B7B]">Your balance</span>
						<span className={`font-medium ${getBalanceTextClass()}`}>
							{isTokenBalanceLoading
								? 'Loading...'
								: isTokenBalanceError
									? 'Failed to load'
									: `${formatTokenBalance(tokenBalance)} USDC`}
						</span>
					</div>

					{/* Separator */}
					<div className="border-t border-[#E5E5E5]" />

					{/* Amount — large display */}
					<div className="flex items-center justify-between">
						<span className="text-[#7B7B7B]">Amount</span>
						<span className="font-clash-display text-lg font-semibold">
							{formatPaymentAmount(session)} USDC
						</span>
					</div>
				</div>
			</div>

			{/* Token balance RPC error — explain why Pay is disabled */}
			{isTokenBalanceError && (
				<div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-600">
					Unable to read token balance. Check your wallet connection and try
					again.
				</div>
			)}

			{/* Insufficient balance warning */}
			{!isTokenBalanceLoading && !isTokenBalanceError && !hasEnoughTokens() && (
				<div className="rounded-xl bg-red-50 px-4 py-3 text-center text-xs text-red-600">
					Insufficient USDC balance. You need {formatPaymentAmount(session)}{' '}
					USDC.
				</div>
			)}

			{/* Chain switch notice */}
			{!isCorrectChain && hasEnoughTokens() && (
				<p className="text-center text-xs text-amber-600">
					You&apos;ll be prompted to switch to {CHAIN_NAMES[selectedChainId]}
				</p>
			)}

			<Button
				onClick={onPay}
				disabled={isPayDisabled()}
				className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				{(isProcessing || !!txSubmitted) && (
					<Loader2 className="mr-2 size-4 animate-spin" />
				)}
				{getPayButtonText()}
			</Button>
		</div>
	);
}
