'use client';

import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { erc20Abi, getAddress } from 'viem';
import {
	useAccount,
	useBalance,
	useSignMessage,
	useSwitchChain,
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
import { WalletStep } from '@/components/payment/crypto-checkout/wallet-step';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { getCryptoCheckoutErrorMessage } from '@/lib/checkout/error-messages';
import { isUserRejection } from '@/lib/web3/errors';
import { createCryptoCheckout } from '@/services/payment/create-crypto-checkout';
import { submitCryptoTx } from '@/services/payment/submit-crypto-tx';
import { usePollOrderStatus } from '@/services/payment/use-poll-order-status';
import { useWallets } from '@/services/wallet/use-wallets';
import { verifyWallet } from '@/services/wallet/verify-wallet';
import { ORDER_STATUS } from '@/types/order';
import type { CryptoCheckoutSession } from '@/types/wallet';

// ==========================================
// Types
// ==========================================

interface CryptoCheckoutModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orderId: string;
	cryptoChainIds: number[];
	userId?: string | null;
	onSuccess?: () => void;
}

/**
 * Modal flow steps for crypto checkout
 */
type CheckoutStep =
	| 'select-chain'
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
 * 2. Connect & Verify Wallet — RainbowKit connect + EIP-191 signature verification
 * 3. Review & Send — create checkout session, execute ERC20 transfer, submit tx hash
 * 4. Confirming — poll order status until backend confirms
 * 5. Success/Failure — terminal state with tx explorer link
 */
export function CryptoCheckoutModal({
	open,
	onOpenChange,
	orderId,
	cryptoChainIds,
	userId,
	onSuccess,
}: CryptoCheckoutModalProps) {
	const [step, setStep] = useState<CheckoutStep>('select-chain');
	const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
	const [session, setSession] = useState<CryptoCheckoutSession | null>(null);
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

	// Ref-based idempotency guard for submitCryptoTx effect.
	// Unlike txSubmitted (state), this is synchronous — prevents duplicate backend
	// submissions even when React batches state updates or re-runs effects (Strict Mode).
	const txSubmittedToBackend = useRef(false);

	const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
		hash: txHash,
	});

	// Native token balance (ETH/MATIC) — shown as gas indicator
	const { data: nativeBalance } = useBalance({
		address,
		chainId: selectedChainId ?? undefined,
	});

	// USDC token balance — shown so user knows if they have enough
	const { data: tokenBalance, isLoading: isTokenBalanceLoading } = useBalance({
		address,
		token: session?.tokenAddress as `0x${string}` | undefined,
		chainId: selectedChainId ?? undefined,
	});

	// Backend hooks
	const { data: walletsData, refetch: refetchWallets } = useWallets({
		enabled: open,
	});
	const { data: polledOrder } = usePollOrderStatus(
		step === 'confirming' ? orderId : null,
	);

	// ==========================================
	// Derived State
	// ==========================================

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

	// ==========================================
	// Effects
	// ==========================================

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
				setErrorMessage(
					'Failed to submit transaction. Please contact support.',
				);
				setStep('failure');
				return;
			}

			// Step already 'confirming' — polling effect handles success/failure transition
		}

		submitTx();
	}, [isTxConfirmed, txHash, session, step]);

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
	 * Step 1: User selects a chain
	 */
	function handleSelectChain(chainId: number) {
		setSelectedChainId(chainId);
		setStep('connect-wallet');
	}

	/**
	 * Step 2: After wallet is connected, verify if needed then create checkout session
	 *
	 * EIP-191 signature message format must match backend exactly:
	 * "Link wallet {checksummedAddress} to Raffles account {userId} at {isoTimestamp}"
	 */
	const handleWalletReady = useCallback(async () => {
		if (!address || !selectedChainId) return;

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
					toast.error('Wallet verification failed. Please try again.');
					setIsProcessing(false);
					return;
				}

				await refetchWallets();
			}

			// Reuse existing session if same chain and not expired — avoids unnecessary
			// API calls when user navigates Back from review and clicks Continue again.
			const existingSessionValid =
				session &&
				session.chainId === selectedChainId &&
				new Date(session.expiresAt).getTime() > Date.now();

			if (existingSessionValid) {
				setStep('review');
				setIsProcessing(false);
				return;
			}

			// Create checkout session so Review step shows the amount
			const checkoutResult = await createCryptoCheckout({
				orderId,
				chainId: selectedChainId,
				walletAddress: address,
				token: 'usdc',
			});

			if (!checkoutResult.success) {
				setErrorMessage(getCryptoCheckoutErrorMessage(checkoutResult.error));
				setStep('failure');
				return;
			}

			setSession(checkoutResult.data);
			setStep('review');
		} catch (error) {
			if (isUserRejection(error)) {
				toast.info('Signature cancelled.');
			} else {
				toast.error('Signature failed. Please try again.');
			}
		} finally {
			setIsProcessing(false);
		}
	}, [
		address,
		selectedChainId,
		isWalletVerified,
		userId,
		signMessageAsync,
		refetchWallets,
		orderId,
		session,
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
			// amountRaw is already in token's smallest unit (6 decimals for USDC)
			// e.g. $10 USDC → amountRaw = "10000000"
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
			// Revert guards — allow retry on rejection or failure
			payInFlight.current = false;
			setTxSubmitted(false);

			// User rejected the tx in their wallet — not an error, just stay on review
			if (isUserRejection(error)) {
				toast.info('Transaction cancelled.');
				return;
			}

			console.error('Crypto payment error:', error);
			setErrorMessage('Transaction failed. Please try again.');
			setStep('failure');
		} finally {
			setIsProcessing(false);
		}
	}

	/**
	 * Resets modal state for retry or close
	 */
	function handleReset() {
		setStep('select-chain');
		setSelectedChainId(null);
		setSession(null);
		setIsProcessing(false);
		setErrorMessage(null);
		setTxSubmitted(false);
		// Reset ref guards so retried flow can submit again
		payInFlight.current = false;
		txSubmittedToBackend.current = false;
		// Reset wagmi write state so stale txHash doesn't persist across retries
		resetWriteContract();
	}

	/**
	 * Close modal and reset state
	 */
	function handleClose() {
		onOpenChange(false);
		// Delay reset to avoid flash during close animation
		setTimeout(handleReset, 300);
	}

	/**
	 * Navigate back one step
	 */
	function handleBack() {
		switch (step) {
			case 'connect-wallet':
				setSelectedChainId(null);
				setStep('select-chain');
				break;
			case 'review':
				// Clear session — user may change wallet or chain on re-entry.
				// handleWalletReady will reuse it if same chain + not expired.
				setSession(null);
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
	 * Whether the back button should be visible
	 */
	function showBackButton(): boolean {
		return step === 'connect-wallet' || step === 'review';
	}

	/**
	 * Step progress indicator (1-indexed for display)
	 */
	function getStepNumber(): number {
		switch (step) {
			case 'select-chain':
				return 1;
			case 'connect-wallet':
				return 2;
			case 'review':
				return 3;
			default:
				return 0;
		}
	}

	/**
	 * Whether to show the step progress dots
	 */
	function showStepIndicator(): boolean {
		return (
			step === 'select-chain' || step === 'connect-wallet' || step === 'review'
		);
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
							className="absolute top-0 -left-1 rounded-full p-1 text-[#7B7B7B] transition-colors hover:bg-gray-100 hover:text-black"
							aria-label="Go back"
						>
							<ArrowLeft className="size-4" />
						</button>
					)}
					<DialogTitle className="font-clash-display text-xl">
						{getStepTitle()}
					</DialogTitle>

					{/* Step progress dots */}
					{showStepIndicator() && (
						<div className="flex items-center justify-center gap-1.5 pt-1">
							{[1, 2, 3].map(n => (
								<div
									key={n}
									className={`h-1 rounded-full transition-all duration-300 ${
										n <= getStepNumber() ? 'w-6 bg-black' : 'w-1.5 bg-[#E5E5E5]'
									}`}
								/>
							))}
						</div>
					)}
				</DialogHeader>

				<div className="flex flex-col gap-4 pt-2">
					{step === 'select-chain' && (
						<ChainSelector
							cryptoChainIds={cryptoChainIds}
							onSelectChain={handleSelectChain}
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
							isCorrectChain={isCorrectChain}
							tokenBalance={tokenBalance ?? undefined}
							isTokenBalanceLoading={isTokenBalanceLoading}
							isProcessing={isProcessing}
							txSubmitted={txSubmitted}
							onPay={handlePay}
						/>
					)}
					{step === 'confirming' && selectedChainId && (
						<ConfirmingStep txHash={txHash} selectedChainId={selectedChainId} />
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
