'use client';

import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { erc20Abi, getAddress } from 'viem';
import {
	useAccount,
	useBalance,
	useReadContract,
	useSignMessage,
	useSwitchChain,
	useTransaction,
	useTransactionConfirmations,
	useWaitForTransactionReceipt,
	useWriteContract,
} from 'wagmi';

import { ChainSelector } from '@/components/payment/crypto-checkout/chain-selector';
import { ConfirmingStep } from '@/components/payment/crypto-checkout/confirming-step';
import { ReviewStep } from '@/components/payment/crypto-checkout/review-step';
import {
	FailureStep,
	SuccessStep,
} from '@/components/payment/crypto-checkout/terminal-steps';
import { TokenSelector } from '@/components/payment/crypto-checkout/token-selector';
import { WalletStep } from '@/components/payment/crypto-checkout/wallet-step';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	getPaymentErrorMessage,
	getWalletErrorMessage,
} from '@/lib/checkout/error-messages';
import { getConfirmationTarget } from '@/lib/web3/block-explorers';
import { isUserRejection } from '@/lib/web3/errors';
import {
	getAllChainIds,
	getTokensForChain,
	type TokenInfo,
} from '@/lib/web3/tokens';
import { cancelPaymentSession } from '@/services/payment/cancel-payment-session';
import { confirmCryptoTx } from '@/services/payment/confirm-crypto-tx';
import { createCryptoCheckout } from '@/services/payment/create-crypto-checkout';
import { submitCryptoTx } from '@/services/payment/submit-crypto-tx';
import { usePollOrderStatus } from '@/services/payment/use-poll-order-status';
import { PAYMENT_ERROR_CODES } from '@/types/errors';
import { useWallets } from '@/services/wallet/use-wallets';
import { verifyWallet } from '@/services/wallet/verify-wallet';
import { ORDER_STATUS } from '@/types/order';
import type { CryptoCheckoutSession } from '@/types/wallet';

// ==========================================
// Constants
// ==========================================

/** Total steps when token selection is shown (multi-token chain) */
const TOTAL_STEPS_WITH_TOKEN = 4;

/** Total steps when token selection is auto-skipped (single-token chain) */
const TOTAL_STEPS_WITHOUT_TOKEN = 3;

// ==========================================
// Types
// ==========================================

interface CryptoCheckoutModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orderId: string;
	cryptoChainIds: number[];
	/** Allowed token slugs from raffle — empty means all tokens allowed */
	cryptoTokens?: string[];
	userId?: string | null;
	onSuccess?: () => void;
	/** Notifies parent when confirming state changes — used to show persistent "pending" button */
	onConfirmingChange?: (isConfirming: boolean) => void;
}

/**
 * Modal flow steps for crypto checkout.
 * select-token is auto-skipped when chain has only one token.
 */
type CheckoutStep =
	| 'select-chain'
	| 'select-token'
	| 'connect-wallet'
	| 'review'
	| 'confirming'
	| 'success'
	| 'failure';

// ==========================================
// Component
// ==========================================

/**
 * CryptoCheckoutModal Component
 *
 * Multi-step modal handling the full crypto payment flow:
 * 1. Select Chain — user picks target chain from raffle's supported chains
 * 2. Select Token — user picks token (auto-skipped if chain has single token)
 * 3. Connect & Verify Wallet — RainbowKit connect + EIP-191 signature verification
 * 4. Review & Send — cancel existing session, create checkout, execute ERC20 transfer, submit tx hash
 * 5. Confirming — poll order status until backend confirms
 * 6. Success/Failure — terminal state with tx explorer link
 *
 * Cross-method guard: cancels any active Stripe/crypto session before creating
 * a new crypto session, preventing "stripe-session-active" / "crypto-session-active" errors.
 */
export function CryptoCheckoutModal({
	open,
	onOpenChange,
	orderId,
	cryptoChainIds,
	cryptoTokens = [],
	userId,
	onSuccess,
	onConfirmingChange,
}: CryptoCheckoutModalProps) {
	const [step, setStep] = useState<CheckoutStep>('select-chain');
	const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
	const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
	const [session, setSession] = useState<CryptoCheckoutSession | null>(null);
	// Tracks which token slug was used to create the current session — needed
	// to detect token changes when user navigates back and picks a different token.
	// Can't compare via session.tokenAddress because frontend doesn't have slug→address mapping.
	const [sessionTokenSlug, setSessionTokenSlug] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Wagmi hooks
	const { address, chainId: connectedChainId } = useAccount();
	const { signMessageAsync } = useSignMessage();
	const { switchChainAsync } = useSwitchChain();
	const {
		writeContractAsync,
		data: txHash,
		reset: resetWriteContract,
	} = useWriteContract();

	// Guards against double-payment — set true immediately after writeContractAsync resolves,
	// before React re-renders. Cleared only in handleReset.
	const [txSubmitted, setTxSubmitted] = useState(false);

	// Synchronous ref guard for handlePay — prevents double-execution from rapid clicks.
	// React state (txSubmitted) is batched/async, so two clicks before re-render would
	// both pass the state check. This ref is set synchronously at function entry.
	const payInFlight = useRef(false);

	// Same pattern for handleWalletReady — prevents duplicate verify+checkout calls
	// when user rapid-clicks "Continue" on the wallet step.
	const walletReadyInFlight = useRef(false);

	// Ref-based idempotency guard for submitCryptoTx effect.
	// Unlike txSubmitted (state), this is synchronous — prevents duplicate backend
	// submissions even when React batches state updates or re-runs effects (Strict Mode).
	const txSubmittedToBackend = useRef(false);

	// Idempotency guard for confirmCryptoTx — the FE-driven finalization call.
	// Fires once when on-chain confirmations reach the chain's target threshold.
	// Separate from txSubmittedToBackend because submit (hash notification) and
	// confirm (finalization request) are two distinct backend calls.
	const txConfirmRequested = useRef(false);

	// chainId is required — without it wagmi defaults to the connected chain,
	// which may differ from the target chain after switchChainAsync. This caused
	// the "stuck on confirming" bug: receipt lookup hit the wrong chain's RPC.
	const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
		hash: txHash,
		chainId: selectedChainId ?? undefined,
	});

	// ---- Confirmation tracking ----
	// Tracks live confirmation block count for display in the confirming step.
	// wagmi polls the RPC for the tx's block number vs current block.
	const confirmingEnabled = step === 'confirming' && !!txHash;

	const { data: confirmationCount } = useTransactionConfirmations({
		hash: txHash,
		chainId: selectedChainId ?? undefined,
		query: {
			enabled: confirmingEnabled,
			// Poll every 4s — slightly less than block time on most L2s,
			// fast enough to show progress without excessive RPC calls
			refetchInterval: confirmingEnabled ? 4_000 : false,
		},
	});

	// ---- Reorg detection ----
	// Fetches the tx object from the RPC. If the tx was included in a block that got
	// reorged, the RPC errors (tx no longer exists in the canonical chain).
	// `isError` true with consecutive failures (failureCount ≥ 2) signals a reorg.
	const { isError: isTxError, failureCount: txFailureCount } = useTransaction({
		hash: txHash,
		chainId: selectedChainId ?? undefined,
		query: {
			enabled: confirmingEnabled,
			// Poll less frequently — reorgs are rare, 8s is plenty
			refetchInterval: confirmingEnabled ? 8_000 : false,
			// Retry once before concluding tx is gone — transient RPC errors are common
			retry: 1,
		},
	});

	// ERC20 token balance — read balanceOf + decimals + symbol individually.
	// Individual useReadContract calls instead of useReadContracts because:
	// 1. useReadContracts uses multicall3 which can silently return zero when
	//    the wallet is connected to a different chain than the target chainId
	// 2. Individual calls route directly to the target chain's RPC transport,
	//    bypassing multicall aggregation issues with cross-chain reads
	const tokenAddress = session?.tokenAddress as `0x${string}` | undefined;
	const targetChainId = selectedChainId ?? undefined;
	const tokenQueryEnabled = !!tokenAddress && !!address;

	// ---- Balance recheck for reorg recovery ----
	// Separate balance read that's only enabled during confirming to detect if funds
	// were actually deducted after a suspected reorg. Uses a different query key than
	// the review-step balance read (via enabled flag gating).
	const { refetch: refetchConfirmingBalance } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'balanceOf',
		args: address ? [address] : undefined,
		chainId: targetChainId,
		query: { enabled: confirmingEnabled && tokenQueryEnabled },
	});

	// Native token balance (ETH/MATIC) — shown as gas indicator
	const { data: nativeBalance } = useBalance({
		address,
		chainId: selectedChainId ?? undefined,
	});

	const {
		data: rawBalance,
		isLoading: isBalanceLoading,
		isError: isBalanceError,
	} = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'balanceOf',
		args: address ? [address] : undefined,
		chainId: targetChainId,
		query: { enabled: tokenQueryEnabled },
	});

	const { data: rawDecimals, isLoading: isDecimalsLoading } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'decimals',
		chainId: targetChainId,
		query: { enabled: tokenQueryEnabled },
	});

	const { data: rawSymbol, isLoading: isSymbolLoading } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: 'symbol',
		chainId: targetChainId,
		query: { enabled: tokenQueryEnabled },
	});

	const isTokenBalanceLoading =
		isBalanceLoading || isDecimalsLoading || isSymbolLoading;
	const isTokenBalanceError = isBalanceError;

	// Shape token data to match the interface ReviewStep expects
	const tokenBalance = useMemo(() => {
		if (rawBalance === undefined || rawDecimals === undefined) return undefined;
		return {
			value: rawBalance as bigint,
			decimals: rawDecimals as number,
			symbol: (rawSymbol as string) ?? 'USDC',
		};
	}, [rawBalance, rawDecimals, rawSymbol]);

	// Backend hooks
	const { data: walletsData, refetch: refetchWallets } = useWallets({
		// Guard on userId — without auth, getWallets returns 401 silently
		enabled: open && !!userId,
	});
	const { data: polledOrder, isExpired: isPollingExpired } = usePollOrderStatus(
		step === 'confirming' ? orderId : null,
	);

	// ==========================================
	// Derived State
	// ==========================================

	/**
	 * Resolved chain IDs — empty from API means "all chains allowed",
	 * so fall back to every chain in the token registry.
	 * Chains with zero allowed tokens are filtered out to prevent
	 * selecting a chain that has no valid payment option.
	 */
	const resolvedChainIds = useMemo(() => {
		const baseChains =
			cryptoChainIds.length > 0 ? cryptoChainIds : getAllChainIds();

		// Filter to only chains that have at least one allowed token
		if (cryptoTokens.length === 0) return baseChains;
		return baseChains.filter(chainId => {
			const chainTokens = getTokensForChain(chainId);
			return chainTokens.some(t => cryptoTokens.includes(t.slug));
		});
	}, [cryptoChainIds, cryptoTokens]);

	/**
	 * Checks if current wallet address is already verified on backend
	 */
	const isWalletVerified = useMemo(() => {
		if (!address || !walletsData?.wallets) return false;
		return walletsData.wallets.some(
			w => w.address.toLowerCase() === address.toLowerCase(),
		);
	}, [address, walletsData]);

	/**
	 * Whether user is on the correct chain for the selected checkout
	 */
	const isCorrectChain = selectedChainId === connectedChainId;

	/**
	 * Display symbol for the selected token — used across review and warning UI
	 */
	const tokenSymbol = selectedToken?.label ?? 'USDC';

	// ==========================================
	// Effects
	// ==========================================

	/**
	 * Notify parent of confirming state changes — drives the persistent
	 * "pending transaction" button in CryptoBuyButton.
	 * Fires on step transitions to/from 'confirming'.
	 */
	useEffect(() => {
		onConfirmingChange?.(step === 'confirming');
	}, [step, onConfirmingChange]);

	/**
	 * After tx is confirmed on-chain, submit hash to backend and start polling.
	 * Uses txSubmittedToBackend ref as idempotency guard — effect can re-run when
	 * other deps change (e.g. step transitions), but backend call must happen exactly once.
	 */
	useEffect(() => {
		if (!isTxConfirmed || !txHash || !session || step !== 'confirming') return;
		// Synchronous ref check — survives React re-renders and Strict Mode double-invocation
		if (txSubmittedToBackend.current) return;
		txSubmittedToBackend.current = true;

		async function submitTx() {
			const result = await submitCryptoTx({
				sessionId: session!.id,
				txHash: txHash!,
			});

			if (!result.success) {
				setErrorMessage(getPaymentErrorMessage(result.error));
				setStep('failure');
				return;
			}

			// Step already 'confirming' — polling effect handles success/failure transition
		}

		submitTx();
	}, [isTxConfirmed, txHash, session, step]);

	/**
	 * FE-driven finalization — when on-chain confirmations reach the chain's target,
	 * proactively ask backend to finalize the payment instead of waiting for the cron.
	 *
	 * This is an optimization, not a requirement:
	 * - If backend already moved the order to COMPLETED (cron was faster), this is a no-op
	 * - If backend hasn't processed yet, it validates the tx and finalizes synchronously
	 * - On failure, we don't transition to error — polling/cron remain as fallback
	 *
	 * Fires after txSubmittedToBackend (hash must be known to backend first).
	 * Uses txConfirmRequested ref for idempotency — exactly one call per tx.
	 */
	useEffect(() => {
		if (step !== 'confirming' || !txHash || !session || !selectedChainId)
			return;
		// Wait until submit-tx call has fired — backend needs the hash first
		if (!txSubmittedToBackend.current) return;
		// Only fire once per tx
		if (txConfirmRequested.current) return;

		const target = getConfirmationTarget(selectedChainId);
		const currentConfirmations =
			confirmationCount !== undefined ? Number(confirmationCount) : 0;
		if (currentConfirmations < target) return;

		txConfirmRequested.current = true;

		async function requestConfirmation() {
			const result = await confirmCryptoTx({
				sessionId: session!.id,
				txHash: txHash!,
				chainId: selectedChainId!,
				confirmations: Number(confirmationCount),
			});

			if (!result.success) {
				// Non-fatal — polling/cron will finalize eventually.
				// Log for debugging but don't interrupt the user's confirming experience.
				console.warn(
					'FE-driven confirm failed, falling back to cron:',
					result.error,
				);
				return;
			}

			// Backend confirmed — if order is COMPLETED, transition immediately
			if (result.data.status === ORDER_STATUS.COMPLETED) {
				setStep('success');
				onSuccess?.();
			}
			// Any other status: cron/polling will handle the final transition
		}

		requestConfirmation();
	}, [step, txHash, session, selectedChainId, confirmationCount, onSuccess]);

	/**
	 * Transition to success/failure when polling detects terminal state
	 */
	useEffect(() => {
		if (!polledOrder || step !== 'confirming') return;

		if (polledOrder.status === ORDER_STATUS.COMPLETED) {
			setStep('success');
			onSuccess?.();
		} else if (
			polledOrder.status === ORDER_STATUS.FAILED ||
			polledOrder.status === ORDER_STATUS.REFUNDED
		) {
			setErrorMessage('Payment verification failed. Please contact support.');
			setStep('failure');
		}
	}, [polledOrder, step, onSuccess]);

	/**
	 * Polling timeout — transitions to failure when polling exceeds max duration.
	 * Safety net for cases where backend never moves order to terminal status
	 * (e.g. tx validation stuck, session expired without cleanup).
	 */
	useEffect(() => {
		if (!isPollingExpired || step !== 'confirming') return;
		setErrorMessage(
			'Payment verification timed out. Your transaction may still be processing — please check your order history or contact support.',
		);
		setStep('failure');
	}, [isPollingExpired, step]);

	/**
	 * Reorg detection — if the RPC stops returning the transaction (null data or errors
	 * after retries), the tx may have been dropped from the canonical chain.
	 *
	 * Recovery flow:
	 * 1. Detect tx gone (isTxError with 2+ consecutive failures after retry)
	 * 2. Recheck the user's token balance on-chain
	 * 3a. If balance ≥ payment amount → funds weren't deducted → safe to retry
	 * 3b. If balance < payment amount → funds were deducted but tx vanished → contact support
	 *
	 * Only triggers after txSubmittedToBackend (we have a hash and entered confirming).
	 * The failure count threshold (2) prevents false positives from transient RPC hiccups.
	 */
	useEffect(() => {
		if (step !== 'confirming' || !txHash) return;
		if (!txSubmittedToBackend.current) return;

		// isTxError with failureCount ≥ 2 means consecutive failures after retry
		// (not transient). wagmi's useTransaction returns `undefined` (not `null`)
		// when tx is missing, so error state is the only reliable reorg signal.
		const txLikelyGone = isTxError && txFailureCount >= 2;

		if (!txLikelyGone) return;

		async function handlePossibleReorg() {
			// Recheck balance to determine if funds left the wallet
			const { data: freshBalance } = await refetchConfirmingBalance();

			if (!session) {
				setErrorMessage(
					'Transaction may have been removed from the blockchain. Please contact support.',
				);
				setStep('failure');
				return;
			}

			const paymentAmount = BigInt(session.amountRaw);
			// If fresh balance covers the payment → funds weren't deducted → safe to retry
			const fundsStillAvailable =
				freshBalance !== undefined && (freshBalance as bigint) >= paymentAmount;

			if (fundsStillAvailable) {
				setErrorMessage(
					'Your transaction was removed from the blockchain (chain reorganization). Your funds were not deducted — you can safely try again.',
				);
			} else {
				// Funds appear deducted but tx vanished — ambiguous state, need support
				setErrorMessage(
					'Your transaction may have been affected by a chain reorganization. Please contact support with your transaction hash for assistance.',
				);
			}
			setStep('failure');
		}

		handlePossibleReorg();
	}, [
		step,
		txHash,
		isTxError,
		txFailureCount,
		session,
		refetchConfirmingBalance,
	]);

	/**
	 * Session expiry timer — transitions to failure when checkout session expires.
	 * Runs only during 'confirming' step since that's when we're waiting on backend.
	 * Backend won't accept tx submissions after expiry, so we proactively fail.
	 */
	useEffect(() => {
		if (step !== 'confirming' || !session?.expiresAt) return;

		const msUntilExpiry = new Date(session.expiresAt).getTime() - Date.now();

		/** Handles session expiry — extracted to avoid duplicating the error message */
		function handleExpiry() {
			setErrorMessage('Checkout session expired. Please try again.');
			setStep('failure');
		}

		// Already expired — transition immediately
		if (msUntilExpiry <= 0) {
			handleExpiry();
			return;
		}

		const timer = setTimeout(handleExpiry, msUntilExpiry);
		return () => clearTimeout(timer);
	}, [step, session?.expiresAt]);

	// ==========================================
	// Handlers
	// ==========================================

	/**
	 * Gets allowed tokens for a chain, filtered by raffle's cryptoTokens.
	 * Empty cryptoTokens means all tokens for the chain are allowed.
	 */
	function getAllowedTokens(chainId: number): TokenInfo[] {
		const chainTokens = getTokensForChain(chainId);
		if (cryptoTokens.length === 0) return chainTokens;
		return chainTokens.filter(t => cryptoTokens.includes(t.slug));
	}

	/**
	 * Step 1: User selects a chain.
	 * If chain has only one allowed token, auto-select it and skip token step.
	 * If multiple tokens, show token selector.
	 */
	function handleSelectChain(chainId: number) {
		setSelectedChainId(chainId);

		const tokens = getAllowedTokens(chainId);

		// Single token available — auto-select and skip to wallet step.
		// tokens[0] is always defined here because resolvedChainIds pre-filters
		// chains that have zero allowed tokens.
		if (tokens.length <= 1) {
			setSelectedToken(tokens[0]!);
			setStep('connect-wallet');
			return;
		}

		// Multiple tokens — show token selector
		setStep('select-token');
	}

	/**
	 * Step 1b: User selects a token from available options for the chain.
	 */
	function handleSelectToken(token: TokenInfo) {
		setSelectedToken(token);
		setStep('connect-wallet');
	}

	/**
	 * Step 2: After wallet is connected, verify if needed then create checkout session.
	 *
	 * Cross-method guard: cancels any active payment session on this order before
	 * creating the crypto session. This handles the case where user started a Stripe
	 * checkout, went back, and now wants to pay with crypto on the same order.
	 *
	 * EIP-191 signature message format must match backend exactly:
	 * "Link wallet {checksummedAddress} to Raffles account {userId} at {isoTimestamp}"
	 */
	const handleWalletReady = useCallback(async () => {
		if (!address || !selectedChainId || !selectedToken) return;
		// Synchronous ref guard — same pattern as payInFlight for handlePay.
		if (walletReadyInFlight.current) return;
		walletReadyInFlight.current = true;

		setIsProcessing(true);

		try {
			// Verify wallet if not already verified
			if (!isWalletVerified) {
				if (!userId) {
					toast.error('Please sign in to verify your wallet.');
					setIsProcessing(false);
					return;
				}

				const timestamp = new Date().toISOString();
				// EIP-55 checksum address — must match backend's verification format exactly.
				// wagmi returns lowercase; backend checksums before building expected message.
				const checksummedAddress = getAddress(address);
				const message = `Link wallet ${checksummedAddress} to Raffles account ${userId} at ${timestamp}`;

				const signature = await signMessageAsync({ message });

				const result = await verifyWallet({
					address,
					message,
					signature,
					timestamp,
				});

				if (!result.success) {
					toast.error(getWalletErrorMessage(result.error));
					setIsProcessing(false);
					return;
				}

				await refetchWallets();
			}

			// Reuse existing session if same chain, same token, and not expired — avoids
			// unnecessary API calls when user navigates Back from review and clicks Continue again.
			// Token check uses tokenAddress from session vs current session — backend resolves
			// slug→address, so we can't compare slug directly. Instead we track selectedToken
			// at session creation time via sessionTokenSlug stored alongside the session.
			const existingSessionValid =
				session &&
				session.chainId === selectedChainId &&
				sessionTokenSlug === selectedToken.slug &&
				new Date(session.expiresAt).getTime() > Date.now();

			if (existingSessionValid) {
				setStep('review');
				setIsProcessing(false);
				return;
			}

			// Cancel any active payment session on this order before creating crypto session.
			// Idempotent — safe even if no session exists. Clears cross-method guards so
			// crypto checkout doesn't fail with "stripe-session-active".
			const cancelResult = await cancelPaymentSession(orderId);

			if (!cancelResult.success) {
				// Only block on crypto-confirming — tx is on-chain and can't be cancelled
				if (
					cancelResult.error === PAYMENT_ERROR_CODES.CANCEL_CRYPTO_CONFIRMING
				) {
					setErrorMessage(getPaymentErrorMessage(cancelResult.error));
					setStep('failure');
					return;
				}
				// Other cancel errors (permission, not-pending) are non-fatal —
				// proceed and let createCryptoCheckout handle them
			}

			// Create checkout session so Review step shows the amount
			const checkoutResult = await createCryptoCheckout({
				orderId,
				chainId: selectedChainId,
				walletAddress: address,
				token: selectedToken.slug,
			});

			if (!checkoutResult.success) {
				setErrorMessage(getPaymentErrorMessage(checkoutResult.error));
				setStep('failure');
				return;
			}

			setSession(checkoutResult.data);
			setSessionTokenSlug(selectedToken.slug);
			setStep('review');
		} catch (error) {
			if (isUserRejection(error)) {
				toast.info('Signature cancelled.');
			} else {
				toast.error('Signature failed. Please try again.');
			}
		} finally {
			walletReadyInFlight.current = false;
			setIsProcessing(false);
		}
	}, [
		address,
		selectedChainId,
		selectedToken,
		isWalletVerified,
		userId,
		signMessageAsync,
		refetchWallets,
		orderId,
		session,
		sessionTokenSlug,
	]);

	/**
	 * Step 3: Switch chain if needed, execute ERC20 transfer
	 *
	 * Session is already created in handleWalletReady so amount is visible
	 * before user confirms the transaction.
	 *
	 * Flow:
	 * 1. Switch to selected chain (if not already on it)
	 * 2. Execute ERC20 transfer(treasuryAddress, amountRaw) via wagmi
	 * 3. useWaitForTransactionReceipt watches for on-chain confirmation
	 * 4. Effect submits txHash to backend, transitions to 'confirming'
	 */
	async function handlePay() {
		if (!address || !selectedChainId || !session) return;
		// Synchronous ref guard — closes the double-click window that React state can't.
		// Two rapid clicks both execute before the first setTxSubmitted(true) re-renders.
		if (payInFlight.current) return;
		payInFlight.current = true;

		setTxSubmitted(true);
		setIsProcessing(true);
		setErrorMessage(null);

		try {
			// Switch chain if wallet is on a different network
			if (!isCorrectChain) {
				await switchChainAsync({ chainId: selectedChainId });
			}

			// Execute ERC20 transfer
			// amountRaw is already in token's smallest unit (6 decimals for USDC, 18 for EARNM)
			await writeContractAsync({
				address: session.tokenAddress as `0x${string}`,
				abi: erc20Abi,
				functionName: 'transfer',
				args: [
					session.treasuryAddress as `0x${string}`,
					BigInt(session.amountRaw),
				],
			});

			setStep('confirming');
		} catch (error) {
			// Reset guards in catch only — on success path, payInFlight stays true to prevent
			// double-transfer if React re-renders before confirming step takes over.
			// handleReset clears everything when user retries or closes.
			payInFlight.current = false;
			setTxSubmitted(false);
			setIsProcessing(false);

			// User rejected the tx in their wallet — not an error, just stay on review
			if (isUserRejection(error)) {
				toast.info('Transaction cancelled.');
				return;
			}

			console.error('Crypto payment error:', error);
			setErrorMessage('Transaction failed. Please try again.');
			setStep('failure');
		}
	}

	/**
	 * Resets modal state for retry or close
	 */
	function handleReset() {
		setStep('select-chain');
		setSelectedChainId(null);
		setSelectedToken(null);
		setSession(null);
		setSessionTokenSlug(null);
		setIsProcessing(false);
		setErrorMessage(null);
		setTxSubmitted(false);
		// Reset ref guards so retried flow can submit again
		walletReadyInFlight.current = false;
		payInFlight.current = false;
		txSubmittedToBackend.current = false;
		txConfirmRequested.current = false;
		// Reset wagmi write state so stale txHash doesn't persist across retries
		resetWriteContract();
	}

	/**
	 * Whether the modal is in a non-dismissable confirming state.
	 * When true, closing the modal hides it but preserves all state so the
	 * user can reopen and resume watching confirmation progress.
	 */
	function isInConfirmingState(): boolean {
		return step === 'confirming';
	}

	/**
	 * Close modal — preserves state during confirming step so user can reopen.
	 * Fully resets on all other steps (select, review, terminal).
	 */
	function handleClose() {
		onOpenChange(false);

		// During confirming: keep all state alive (session, txHash, polling).
		// User can reopen via the "pending transaction" button in CryptoBuyButton.
		if (isInConfirmingState()) return;

		// Delay reset to avoid flash during close animation
		setTimeout(handleReset, 300);
	}

	/**
	 * Navigate back one step
	 */
	function handleBack() {
		switch (step) {
			case 'select-token':
				setSelectedChainId(null);
				setSelectedToken(null);
				setStep('select-chain');
				break;
			case 'connect-wallet':
				// If chain has multiple allowed tokens, go back to token selector.
				// If auto-skipped, go back to chain selector.
				if (selectedChainId && getAllowedTokens(selectedChainId).length > 1) {
					setSelectedToken(null);
					setStep('select-token');
				} else {
					setSelectedChainId(null);
					setSelectedToken(null);
					setStep('select-chain');
				}
				break;
			case 'review':
				// Keep session — reuse check in handleWalletReady skips API call
				// if same chain + not expired. Wallet changes are handled by walletAddress param.
				setStep('connect-wallet');
				break;
			default:
				break;
		}
	}

	// ==========================================
	// Step Metadata
	// ==========================================

	/**
	 * Gets the dialog title for current step
	 */
	function getStepTitle(): string {
		switch (step) {
			case 'select-chain':
				return 'Select Network';
			case 'select-token':
				return 'Select Token';
			case 'connect-wallet':
				return 'Connect Wallet';
			case 'review':
				return 'Review & Pay';
			case 'confirming':
				return 'Confirming';
			case 'success':
				return 'Payment Complete';
			case 'failure':
				return 'Payment Failed';
		}
	}

	/**
	 * Whether the token selection step was shown (multi-token chain).
	 * Drives dynamic step count — when skipped, progress dots show 3 instead of 4.
	 */
	function wasTokenStepShown(): boolean {
		if (!selectedChainId) return false;
		return getAllowedTokens(selectedChainId).length > 1;
	}

	/**
	 * Total navigable steps — 4 when token step is shown, 3 when auto-skipped
	 */
	function getTotalSteps(): number {
		return wasTokenStepShown()
			? TOTAL_STEPS_WITH_TOKEN
			: TOTAL_STEPS_WITHOUT_TOKEN;
	}

	/**
	 * Step progress indicator (1-indexed for display).
	 * Returns 0 for terminal steps (confirming, success, failure) — hides progress dots.
	 * When token step is skipped, connect-wallet becomes step 2 and review becomes step 3.
	 */
	function getStepNumber(): number {
		const tokenShown = wasTokenStepShown();
		switch (step) {
			case 'select-chain':
				return 1;
			case 'select-token':
				return 2;
			case 'connect-wallet':
				return tokenShown ? 3 : 2;
			case 'review':
				return tokenShown ? 4 : 3;
			default:
				return 0;
		}
	}

	/** Back button visible only on navigable steps (not first step or terminal states) */
	function showBackButton(): boolean {
		return getStepNumber() >= 2;
	}

	/**
	 * CSS class for step progress dot — active dots are wider and black
	 */
	function getStepDotClass(n: number): string {
		const base = 'h-1 rounded-full transition-all duration-300';
		return n <= getStepNumber()
			? `${base} w-6 bg-black`
			: `${base} w-1.5 bg-[#E5E5E5]`;
	}

	// ==========================================
	// Render
	// ==========================================

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-md overflow-hidden border border-[#0F0F0FF2] bg-white px-8 py-10">
				{/* Header with back button and step indicator */}
				<DialogHeader className="relative">
					{showBackButton() && (
						<button
							type="button"
							onClick={handleBack}
							className="absolute top-0.5 left-0 rounded-full p-1 text-[#7B7B7B] transition-colors hover:bg-gray-100 hover:text-black"
							aria-label="Go back"
						>
							<ArrowLeft className="size-4" />
						</button>
					)}
					<DialogTitle
						className={`font-clash-display text-xl ${showBackButton() ? 'pl-7' : ''}`}
					>
						{getStepTitle()}
					</DialogTitle>

					{/* Step progress dots */}
					{getStepNumber() > 0 && (
						<div className="flex items-center justify-center gap-1.5 pt-1">
							{Array.from({ length: getTotalSteps() }, (_, i) => i + 1).map(
								n => (
									<div key={n} className={getStepDotClass(n)} />
								),
							)}
						</div>
					)}
				</DialogHeader>

				<div className="flex flex-col gap-4 pt-2">
					{step === 'select-chain' && (
						<ChainSelector
							cryptoChainIds={resolvedChainIds}
							cryptoTokens={cryptoTokens}
							onSelectChain={handleSelectChain}
						/>
					)}
					{step === 'select-token' && selectedChainId && (
						<TokenSelector
							tokens={getAllowedTokens(selectedChainId)}
							onSelectToken={handleSelectToken}
						/>
					)}
					{step === 'connect-wallet' && (
						<WalletStep
							address={address}
							isWalletVerified={isWalletVerified}
							isProcessing={isProcessing}
							nativeBalance={nativeBalance ?? undefined}
							onWalletReady={handleWalletReady}
						/>
					)}
					{step === 'review' && selectedChainId && (
						<ReviewStep
							session={session}
							selectedChainId={selectedChainId}
							tokenSymbol={tokenSymbol}
							isCorrectChain={isCorrectChain}
							tokenBalance={tokenBalance ?? undefined}
							isTokenBalanceLoading={isTokenBalanceLoading}
							isTokenBalanceError={isTokenBalanceError}
							isBalanceCheckPending={!tokenAddress || !address}
							isProcessing={isProcessing}
							txSubmitted={txSubmitted}
							onPay={handlePay}
						/>
					)}
					{step === 'confirming' && selectedChainId && (
						<ConfirmingStep
							txHash={txHash}
							selectedChainId={selectedChainId}
							confirmations={
								confirmationCount !== undefined ? Number(confirmationCount) : 0
							}
							confirmationTarget={getConfirmationTarget(selectedChainId)}
							isTxConfirmed={isTxConfirmed}
						/>
					)}
					{step === 'success' && selectedChainId && (
						<SuccessStep
							txHash={txHash}
							selectedChainId={selectedChainId}
							onClose={handleClose}
						/>
					)}
					{step === 'failure' && selectedChainId && (
						<FailureStep
							txHash={txHash}
							selectedChainId={selectedChainId}
							errorMessage={errorMessage}
							onClose={handleClose}
							onReset={handleReset}
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
