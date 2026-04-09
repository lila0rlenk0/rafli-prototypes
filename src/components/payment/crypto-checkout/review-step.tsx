'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';
import { formatPaymentAmount, formatTokenBalance } from '@/lib/web3/format';
import { getChainName } from '@/lib/web3/block-explorers';
import type { CryptoChainConfig } from '@/types/crypto-config';
import type { CryptoCheckoutSession } from '@/types/wallet';

// ==========================================
// Types
// ==========================================

interface ReviewStepProps {
	session: CryptoCheckoutSession | null;
	raffleEndAt: string;
	/** Parent guarantees non-null — only renders when chain is selected */
	selectedChainId: number;
	/** Token symbol for display (e.g. "USDC", "USDT", "EARNM") */
	tokenSymbol: string;
	isCorrectChain: boolean;
	/** Token balance from wagmi useBalance — undefined while loading or not yet started */
	tokenBalance:
		| { value: bigint; decimals: number; symbol?: string }
		| undefined;
	/** True when token balance is still loading from chain */
	isTokenBalanceLoading: boolean;
	/** True when RPC call to fetch token balance failed */
	isTokenBalanceError?: boolean;
	/**
	 * True when balance read hasn't started yet (no session/token address).
	 * Distinguishes "not started" from "loaded and zero" — prevents false
	 * "Insufficient balance" warning on review step mount.
	 */
	isBalanceCheckPending?: boolean;
	isProcessing: boolean;
	/** True after writeContractAsync returns (Worker A's txSubmitted state) */
	txSubmitted?: boolean;
	/** Local review guard message for wallet changes / expired sessions */
	sessionBlockMessage?: string | null;
	/** Chain configs for display name resolution */
	chains: CryptoChainConfig[];
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
	raffleEndAt,
	selectedChainId,
	tokenSymbol,
	isCorrectChain,
	tokenBalance,
	isTokenBalanceLoading,
	isTokenBalanceError,
	isBalanceCheckPending,
	isProcessing,
	txSubmitted,
	sessionBlockMessage,
	chains,
	onPay,
}: ReviewStepProps) {
	// isExpired not needed — isClosingSoon is only true when secondsRemaining > 0
	const { isClosingSoon, isHydrated } = useRaffleSaleWindow(raffleEndAt);

	/**
	 * Checks if user has enough tokens for the payment.
	 * Returns false when balance is still loading or not yet started — prevents premature pay.
	 */
	function hasEnoughTokens(): boolean {
		if (isBalanceCheckPending || isTokenBalanceLoading) return false;
		// If balance loaded but data is undefined (RPC error, unsupported token),
		// disable Pay — prevents confusing wallet-level failure after clicking Pay
		if (!tokenBalance || !session) return false;
		return tokenBalance.value >= BigInt(session.amountRaw);
	}

	/**
	 * Whether to show the "Insufficient balance" warning.
	 * Only after balance loaded successfully and it's not enough.
	 */
	function shouldShowInsufficientWarning(): boolean {
		if (isBalanceCheckPending || isTokenBalanceLoading || isTokenBalanceError)
			return false;
		return !hasEnoughTokens();
	}

	/**
	 * Gets pay button text based on current state
	 */
	function getPayButtonText(): string {
		if (isProcessing || txSubmitted) return 'Processing...';
		if (sessionBlockMessage) return 'Continue Again';
		if (isBalanceCheckPending || isTokenBalanceLoading)
			return 'Checking balance...';
		return `Pay ${formatPaymentAmount(session)} ${tokenSymbol}`;
	}

	/**
	 * Whether the pay button should be disabled.
	 * hasEnoughTokens() already returns false when balance is loading,
	 * so no need to check isTokenBalanceLoading separately.
	 */
	function isPayDisabled(): boolean {
		return (
			isProcessing ||
			!!txSubmitted ||
			!!sessionBlockMessage ||
			!hasEnoughTokens()
		);
	}

	/**
	 * Text color for the balance row — red when insufficient, normal otherwise.
	 * isTokenBalanceLoading check avoids flashing red before balance arrives.
	 */
	function getBalanceTextClass(): string {
		// Skip red styling when balance is pending, loading, or errored —
		// "Failed to load" shouldn't look like "Insufficient balance"
		if (isBalanceCheckPending || isTokenBalanceLoading || isTokenBalanceError)
			return '';
		return !hasEnoughTokens() ? 'text-red-500' : '';
	}

	/**
	 * Balance display text — shows loading/error/formatted value
	 */
	function getBalanceDisplay(): string {
		if (isBalanceCheckPending || isTokenBalanceLoading) return 'Loading...';
		if (isTokenBalanceError) return 'Failed to load';
		return `${formatTokenBalance(tokenBalance)} ${tokenSymbol}`;
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Payment summary card */}
			<div className="rounded-2xl border border-[#E5E5E5] p-5">
				<div className="flex flex-col gap-3 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-[#7B7B7B]">Network</span>
						<span className="font-medium">
							{getChainName(selectedChainId, chains)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[#7B7B7B]">Token</span>
						<span className="font-medium">{tokenSymbol}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[#7B7B7B]">Your balance</span>
						<span className={`font-medium ${getBalanceTextClass()}`}>
							{getBalanceDisplay()}
						</span>
					</div>

					{/* Separator */}
					<div className="border-t border-[#E5E5E5]" />

					{/* Amount — large display */}
					<div className="flex items-center justify-between">
						<span className="text-[#7B7B7B]">Amount</span>
						<span className="font-clash-display text-lg font-semibold">
							{formatPaymentAmount(session)} {tokenSymbol}
						</span>
					</div>
				</div>
			</div>

			{/* Token balance RPC error — explain why Pay is disabled */}
			{isTokenBalanceError ? (
				<div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-600">
					Unable to read token balance. Check your wallet connection and try
					again.
				</div>
			) : null}

			{/* Review session drift — sending is blocked until wallet step refreshes the session */}
			{sessionBlockMessage ? (
				<div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-700">
					{sessionBlockMessage}
				</div>
			) : null}

			{/* Insufficient balance warning — only after balance loaded successfully */}
			{shouldShowInsufficientWarning() ? (
				<div className="rounded-xl bg-red-50 px-4 py-3 text-center text-xs text-red-600">
					Insufficient {tokenSymbol} balance. You need{' '}
					{formatPaymentAmount(session)} {tokenSymbol}.
				</div>
			) : null}

			{/* Chain switch notice */}
			{!isCorrectChain && hasEnoughTokens() ? (
				<p className="text-center text-xs text-amber-600">
					You&apos;ll be prompted to switch to{' '}
					{getChainName(selectedChainId, chains)}
				</p>
			) : null}

			{isHydrated && isClosingSoon ? (
				<div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-700">
					Less than 10 minutes remain. Crypto confirmations can continue after
					the raffle ends. If settlement lands after draw start, support may
					need to review the purchase.
				</div>
			) : null}

			<Button
				onClick={onPay}
				disabled={isPayDisabled()}
				className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				{isProcessing || !!txSubmitted ? (
					<Loader2 className="mr-2 size-4 animate-spin" />
				) : null}
				{getPayButtonText()}
			</Button>
		</div>
	);
}
