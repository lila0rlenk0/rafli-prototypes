'use client';

import { useMemo } from 'react';
import { erc20Abi, getAddress, type Address } from 'viem';
import {
	useBalance,
	useConnection,
	useReadContract,
	useTransaction,
	useTransactionConfirmations,
} from 'wagmi';

import { getObservedConfirmationCount } from '@/lib/web3/payment/crypto-payment-flow';

// ==========================================
// Types
// ==========================================

/** Shape the review + confirming steps consume — all three fields required. */
export interface NormalizedTokenBalance {
	value: bigint;
	decimals: number;
	symbol: string;
}

export interface UseCheckoutWagmiReadsParams {
	step:
		| 'select-chain'
		| 'select-token'
		| 'connect-wallet'
		| 'review'
		| 'confirming'
		| 'success'
		| 'failure';
	selectedChainId: number | null;
	sessionWalletAddress: Address | null;
	tokenAddress: `0x${string}` | undefined;
	txHash: `0x${string}` | undefined;
}

// ==========================================
// Hook
// ==========================================

/**
 * Centralises every wagmi read the modal needs for the review +
 * confirming steps: connection info, confirmation counts, tx read, token
 * balance/decimals/symbol, native balance, and the confirming-scoped
 * balance refetch.
 *
 * Kept separate from the modal so the parent component stays under the
 * 150-LOC cap and so future wagmi changes have a single blast radius.
 *
 * @param params - Reactive inputs the effects/queries key off
 * @returns Flat object with all the derived values the modal renders
 */
export function useCheckoutWagmiReads(params: UseCheckoutWagmiReadsParams) {
	const { step, selectedChainId, sessionWalletAddress, tokenAddress, txHash } =
		params;
	const { address, chainId: connectedChainId } = useConnection();
	// EIP-55 checksum — equality checks across the flow compare this value.
	const connectedChecksummed = useMemo<Address | null>(
		() => (address ? getAddress(address) : null),
		[address],
	);
	const balanceReadAddress: Address | null =
		sessionWalletAddress ?? connectedChecksummed;
	const confirming = useConfirmingWagmiReads({
		step,
		txHash,
		selectedChainId,
		tokenAddress,
		balanceReadAddress,
	});
	const reviewToken = useReviewTokenReads({
		selectedChainId,
		tokenAddress,
		balanceReadAddress,
	});
	// Native balance (ETH/MATIC) — shown as gas indicator.
	const { data: nativeBalance } = useBalance({
		address,
		chainId: selectedChainId ?? undefined,
	});
	return {
		address,
		connectedChecksummed,
		connectedChainId,
		nativeBalance,
		balanceReadAddress,
		...confirming,
		...reviewToken,
	};
}

// ==========================================
// Sub-hooks
// ==========================================

interface ConfirmingArgs {
	step: UseCheckoutWagmiReadsParams['step'];
	txHash: `0x${string}` | undefined;
	selectedChainId: number | null;
	tokenAddress: `0x${string}` | undefined;
	balanceReadAddress: Address | null;
}

/**
 * Wagmi reads active only during the confirming step: confirmation count,
 * tx receipt probe (for reorg detection), and a balance-refetch callable
 * scoped to the session's bound wallet.
 */
function useConfirmingWagmiReads(args: ConfirmingArgs) {
	const { step, txHash, selectedChainId, tokenAddress, balanceReadAddress } =
		args;
	const confirmingEnabled = step === 'confirming' && !!txHash;
	// Poll every 4s — slightly less than block time on most L2s, fast
	// enough to show progress without excessive RPC calls.
	const { data: confirmationCount } = useTransactionConfirmations({
		hash: txHash,
		chainId: selectedChainId ?? undefined,
		query: {
			enabled: confirmingEnabled,
			refetchInterval: confirmingEnabled ? 4_000 : false,
		},
	});
	// Fetches the tx object from the RPC. If the tx was included in a
	// reorged block, the RPC errors. Only `TransactionNotFoundError` should
	// trigger reorg logic.
	const { error: txError, failureCount: txFailureCount } = useTransaction({
		hash: txHash,
		chainId: selectedChainId ?? undefined,
		query: {
			enabled: confirmingEnabled,
			// Poll less frequently — reorgs are rare, 8s is plenty.
			refetchInterval: confirmingEnabled ? 8_000 : false,
			// Retry once before concluding the tx is gone — transient RPC
			// errors are common.
			retry: 1,
		},
	});
	const { refetch: refetchConfirmingBalance } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'balanceOf',
		args: balanceReadAddress ? [balanceReadAddress] : undefined,
		chainId: selectedChainId ?? undefined,
		query: {
			enabled: confirmingEnabled && !!tokenAddress && !!balanceReadAddress,
		},
	});
	return {
		observedConfirmationCount: getObservedConfirmationCount(confirmationCount),
		txError,
		txFailureCount,
		refetchConfirmingBalance,
	};
}

interface ReviewTokenArgs {
	selectedChainId: number | null;
	tokenAddress: `0x${string}` | undefined;
	balanceReadAddress: Address | null;
}

/**
 * Three individual `useReadContract` calls (instead of `useReadContracts`)
 * because multicall3 can silently return zero when the wallet is connected
 * to a different chain than the target chainId. Individual calls route
 * directly to the target chain's RPC transport, bypassing multicall.
 */
function useReviewTokenReads(args: ReviewTokenArgs) {
	const { selectedChainId, tokenAddress, balanceReadAddress } = args;
	const targetChainId = selectedChainId ?? undefined;
	const enabled = !!tokenAddress && !!balanceReadAddress;
	const {
		data: rawBalance,
		isLoading: isBalanceLoading,
		isError: isBalanceError,
	} = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'balanceOf',
		args: balanceReadAddress ? [balanceReadAddress] : undefined,
		chainId: targetChainId,
		query: { enabled },
	});
	const { data: rawDecimals, isLoading: isDecimalsLoading } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'decimals',
		chainId: targetChainId,
		query: { enabled },
	});
	const { data: rawSymbol, isLoading: isSymbolLoading } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'symbol',
		chainId: targetChainId,
		query: { enabled },
	});
	// All three values must be present — partial data would show the wrong
	// symbol or balance. `erc20Abi` is fully typed; `useReadContract`
	// infers balanceOf→bigint, decimals→number, symbol→string.
	const tokenBalance = useMemo<NormalizedTokenBalance | undefined>(() => {
		if (
			rawBalance === undefined ||
			rawDecimals === undefined ||
			rawSymbol === undefined
		)
			return undefined;
		return { value: rawBalance, decimals: rawDecimals, symbol: rawSymbol };
	}, [rawBalance, rawDecimals, rawSymbol]);
	return {
		tokenBalance,
		isBalanceError,
		isTokenBalanceLoading:
			isBalanceLoading || isDecimalsLoading || isSymbolLoading,
	};
}
