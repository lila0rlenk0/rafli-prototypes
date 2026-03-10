'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
	ArrowLeft,
	CheckCircle2,
	ExternalLink,
	Loader2,
	ShieldCheck,
	XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { erc20Abi, formatUnits } from 'viem';
import {
	useAccount,
	useBalance,
	useSignMessage,
	useSwitchChain,
	useWaitForTransactionReceipt,
	useWriteContract,
} from 'wagmi';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { createCryptoCheckout } from '@/services/payment/create-crypto-checkout';
import { submitCryptoTx } from '@/services/payment/submit-crypto-tx';
import { usePollOrderStatus } from '@/services/payment/use-poll-order-status';
import { useWallets } from '@/services/wallet/use-wallets';
import { verifyWallet } from '@/services/wallet/verify-wallet';
import { ORDER_STATUS } from '@/types/order';
import { CHAIN_NAMES, type CryptoCheckoutSession } from '@/types/wallet';
import { CHAIN_ICONS } from '@/lib/web3/chain-icons';

// ==========================================
// Constants
// ==========================================

/**
 * USDC uses 6 decimals across all chains (not 18 like ETH)
 * Used to format amountRaw for display: 10000000 → "10.00"
 */
const STABLECOIN_DECIMALS = 6;

/**
 * Block explorer base URLs for tx links
 * Maps chain ID → explorer URL prefix
 */
const BLOCK_EXPLORERS: Record<number, string> = {
	1: 'https://etherscan.io/tx/',
	42_161: 'https://arbiscan.io/tx/',
	8453: 'https://basescan.org/tx/',
	137: 'https://polygonscan.com/tx/',
	11_155_111: 'https://sepolia.etherscan.io/tx/',
	421_614: 'https://sepolia.arbiscan.io/tx/',
	84_532: 'https://sepolia.basescan.org/tx/',
};

/**
 * Maps crypto checkout error codes to user-friendly messages
 * Covers both payments:* and core:* prefixed errors
 */
function getCryptoCheckoutErrorMessage(errorCode: string): string {
	switch (errorCode) {
		case 'payments:crypto:wallet-not-verified':
			return 'Your wallet is not verified. Please verify first.';
		case 'payments:crypto:raffle-not-accepting':
			return 'This raffle does not accept crypto payments.';
		case 'payments:crypto:unsupported-chain':
			return 'This chain is not supported for this raffle.';
		case 'payments:crypto:session-expired':
			return 'Checkout session expired. Please try again.';
		case 'payments:crypto:already-completed':
			return 'This payment was already completed.';
		case 'core:order:not-found':
			return 'Order not found. Please try again.';
		case 'core:order:not-pending':
			return 'This order can no longer be paid.';
		case 'unauthorized':
		case 'global:auth:unauthenticated':
			return 'Please sign in to continue.';
		case 'network_error':
			return 'Network error. Please check your connection.';
		case 'timeout_error':
			return 'Request timed out. Please try again.';
		default:
			return `Failed to create checkout session (${errorCode}).`;
	}
}

/**
 * Detects if an error is a user wallet rejection (e.g. clicked "Reject" in MetaMask).
 * wagmi/viem throw errors with specific codes or messages for user denials.
 */
function isUserRejection(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const msg = error.message.toLowerCase();
	// MetaMask / most wallets: "user rejected" or "user denied"
	// WalletConnect: "rejected" in message
	// viem: UserRejectedRequestError has code 4001
	return (
		msg.includes('user rejected') ||
		msg.includes('user denied') ||
		msg.includes('rejected the request') ||
		(error as { code?: number }).code === 4001
	);
}

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
	const { writeContractAsync, data: txHash } = useWriteContract();
	const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
		hash: txHash,
	});

	// Native token balance (ETH/MATIC) — shown as gas indicator
	const { data: nativeBalance } = useBalance({
		address,
		chainId: selectedChainId ?? undefined,
	});

	// USDC token balance — shown so user knows if they have enough
	const { data: tokenBalance } = useBalance({
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

	/**
	 * Formats the payment amount from raw units (6 decimals) to human display
	 * e.g. "10000000" → "10.00"
	 */
	function formatPaymentAmount(): string {
		if (!session) return '—';
		const formatted = formatUnits(
			BigInt(session.amountRaw),
			STABLECOIN_DECIMALS,
		);
		return parseFloat(formatted).toFixed(2);
	}

	/**
	 * Formats native balance for gas indicator
	 * Shows 4 decimal places for ETH/MATIC
	 */
	function formatNativeBalance(): string {
		if (!nativeBalance) return '—';
		return parseFloat(
			formatUnits(nativeBalance.value, nativeBalance.decimals),
		).toFixed(4);
	}

	/**
	 * Formats USDC token balance
	 * Shows 2 decimal places for stablecoins
	 */
	function formatTokenBalance(): string {
		if (!tokenBalance) return '—';
		return parseFloat(
			formatUnits(tokenBalance.value, tokenBalance.decimals),
		).toFixed(2);
	}

	/**
	 * Whether user has enough USDC for the payment
	 */
	function hasEnoughTokens(): boolean {
		if (!tokenBalance || !session) return true; // Assume enough if unknown
		return tokenBalance.value >= BigInt(session.amountRaw);
	}

	/**
	 * Truncates an address for display: 0x1234...5678
	 */
	function truncateAddress(addr: string): string {
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
	}

	/**
	 * Gets block explorer URL for the submitted tx
	 */
	function getTxExplorerUrl(): string | null {
		if (!txHash || !selectedChainId) return null;
		const base = BLOCK_EXPLORERS[selectedChainId];
		if (!base) return null;
		return `${base}${txHash}`;
	}

	// ==========================================
	// Effects
	// ==========================================

	/**
	 * After tx is confirmed on-chain, submit hash to backend and start polling
	 */
	useEffect(() => {
		if (!isTxConfirmed || !txHash || !session || step !== 'review') return;

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

			setStep('confirming');
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
				const message = `Link wallet ${address} to Raffles account ${userId} at ${timestamp}`;

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

			// Create checkout session so Review step shows the amount
			const checkoutResult = await createCryptoCheckout({
				orderId,
				chainId: selectedChainId,
				walletAddress: address,
				token: 'usdc',
			});

			if (!checkoutResult.success) {
				console.error('[CryptoCheckout] session failed:', checkoutResult.error);
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

			// tx hash captured by useWriteContract → useWaitForTransactionReceipt
			// → effect submits to backend → transitions to 'confirming'
		} catch (error) {
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
	// Render Helpers
	// ==========================================

	/**
	 * Renders the chain selector step with static chain icons
	 * Icons from CHAIN_ICONS map — RainbowKit only exposes icons for the connected chain
	 */
	function renderChainSelector() {
		return (
			<div className="flex flex-col gap-3">
				<p className="text-sm text-[#7B7B7B]">Choose which network to pay on</p>
				{cryptoChainIds.map(chainId => {
					const icon = CHAIN_ICONS[chainId];

					return (
						<button
							key={chainId}
							type="button"
							className="group flex h-14 items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-5 text-left transition-all hover:border-black hover:shadow-sm"
							onClick={() => handleSelectChain(chainId)}
						>
							<span className="flex items-center gap-3">
								{icon && (
									<span
										className="flex size-6 items-center justify-center overflow-hidden rounded-full"
										style={{ background: icon.iconBackground }}
									>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											alt={CHAIN_NAMES[chainId] ?? ''}
											src={icon.iconUrl}
											className="size-4"
										/>
									</span>
								)}
								<span className="text-sm font-medium">
									{CHAIN_NAMES[chainId] ?? `Chain ${chainId}`}
								</span>
							</span>
							<span className="text-xs text-[#7B7B7B] transition-colors group-hover:text-black">
								USDC
							</span>
						</button>
					);
				})}
			</div>
		);
	}

	/**
	 * Renders the wallet connect + verify step
	 * Uses ConnectButton.Custom for consistent styling within the modal
	 */
	function renderWalletStep() {
		return (
			<div className="flex flex-col items-center gap-5">
				<p className="text-center text-sm text-[#7B7B7B]">
					{isWalletVerified
						? 'Wallet connected and verified'
						: 'Connect your wallet and verify ownership'}
				</p>

				{/* Custom connect button — styled to match app */}
				{!address && (
					<ConnectButton.Custom>
						{({ openConnectModal }) => (
							<Button
								onClick={openConnectModal}
								variant="outline"
								className="h-12 w-full border-2 border-black bg-white text-black hover:bg-black hover:text-white"
							>
								Connect Wallet
							</Button>
						)}
					</ConnectButton.Custom>
				)}

				{/* Connected wallet info card */}
				{address && (
					<div className="w-full rounded-2xl border border-[#E5E5E5] p-5">
						<div className="flex flex-col gap-3">
							{/* Wallet address */}
							<div className="flex items-center justify-between">
								<span className="text-sm text-[#7B7B7B]">Wallet</span>
								<span className="font-mono text-sm font-medium">
									{truncateAddress(address)}
								</span>
							</div>

							{/* Verification status */}
							<div className="flex items-center justify-between">
								<span className="text-sm text-[#7B7B7B]">Status</span>
								{isWalletVerified ? (
									<span className="flex items-center gap-1 text-sm font-medium text-green-600">
										<ShieldCheck className="size-3.5" />
										Verified
									</span>
								) : (
									<span className="text-sm text-amber-600">
										Needs verification
									</span>
								)}
							</div>

							{/* Native balance for gas */}
							<div className="flex items-center justify-between">
								<span className="text-sm text-[#7B7B7B]">Gas balance</span>
								<span className="text-sm font-medium">
									{formatNativeBalance()} {nativeBalance?.symbol ?? 'ETH'}
								</span>
							</div>
						</div>
					</div>
				)}

				{/* Verify / Continue button */}
				{address && (
					<Button
						onClick={handleWalletReady}
						disabled={isProcessing}
						className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
					>
						{isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
						{isWalletVerified ? 'Continue' : 'Verify Wallet'}
					</Button>
				)}
			</div>
		);
	}

	/**
	 * Renders the review & pay step with payment summary
	 */
	function renderReviewStep() {
		return (
			<div className="flex flex-col gap-4">
				{/* Payment summary card */}
				<div className="rounded-2xl border border-[#E5E5E5] p-5">
					<div className="flex flex-col gap-3 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-[#7B7B7B]">Network</span>
							<span className="font-medium">
								{CHAIN_NAMES[selectedChainId!] ?? `Chain ${selectedChainId}`}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[#7B7B7B]">Token</span>
							<span className="font-medium">USDC</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[#7B7B7B]">Your balance</span>
							<span
								className={`font-medium ${!hasEnoughTokens() ? 'text-red-500' : ''}`}
							>
								{formatTokenBalance()} USDC
							</span>
						</div>

						{/* Separator */}
						<div className="border-t border-[#E5E5E5]" />

						{/* Amount — large display */}
						<div className="flex items-center justify-between">
							<span className="text-[#7B7B7B]">Amount</span>
							<span className="font-clash-display text-lg font-semibold">
								{formatPaymentAmount()} USDC
							</span>
						</div>
					</div>
				</div>

				{/* Insufficient balance warning */}
				{!hasEnoughTokens() && (
					<div className="rounded-xl bg-red-50 px-4 py-3 text-center text-xs text-red-600">
						Insufficient USDC balance. You need {formatPaymentAmount()} USDC.
					</div>
				)}

				{/* Chain switch notice */}
				{!isCorrectChain && hasEnoughTokens() && (
					<p className="text-center text-xs text-amber-600">
						You&apos;ll be prompted to switch to {CHAIN_NAMES[selectedChainId!]}
					</p>
				)}

				<Button
					onClick={handlePay}
					disabled={isProcessing || !hasEnoughTokens()}
					className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
				>
					{isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
					{isProcessing ? 'Processing...' : `Pay ${formatPaymentAmount()} USDC`}
				</Button>
			</div>
		);
	}

	/**
	 * Renders the confirming step with spinner and tx link
	 */
	function renderConfirmingStep() {
		return (
			<div className="flex flex-col items-center gap-5 py-6">
				<div className="relative">
					<div className="absolute inset-0 animate-ping rounded-full bg-black/5" />
					<Loader2 className="size-10 animate-spin text-black" />
				</div>
				<div className="flex flex-col items-center gap-1">
					<p className="text-sm font-medium">Verifying payment on-chain...</p>
					<p className="text-xs text-[#7B7B7B]">This may take a few moments</p>
				</div>
				{renderTxLink()}
			</div>
		);
	}

	/**
	 * Renders the success step
	 */
	function renderSuccessStep() {
		return (
			<div className="flex flex-col items-center gap-5 py-6">
				<div className="flex size-14 items-center justify-center rounded-full bg-green-50">
					<CheckCircle2 className="size-8 text-green-500" />
				</div>
				<div className="flex flex-col items-center gap-1">
					<p className="font-clash-display text-lg font-semibold">
						Payment confirmed!
					</p>
					<p className="text-sm text-[#7B7B7B]">Your tickets are ready.</p>
				</div>
				{renderTxLink()}
				<Button
					onClick={handleClose}
					className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
				>
					Done
				</Button>
			</div>
		);
	}

	/**
	 * Renders the failure step with retry option
	 */
	function renderFailureStep() {
		return (
			<div className="flex flex-col items-center gap-5 py-6">
				<div className="flex size-14 items-center justify-center rounded-full bg-red-50">
					<XCircle className="size-8 text-red-500" />
				</div>
				<p className="text-center text-sm text-red-600">
					{errorMessage ?? 'Something went wrong.'}
				</p>
				{renderTxLink()}
				<div className="flex w-full gap-2">
					<Button
						variant="outline"
						onClick={handleClose}
						className="h-12 flex-1 border-2 border-black bg-white hover:bg-black hover:text-white"
					>
						Close
					</Button>
					<Button
						onClick={handleReset}
						className="h-12 flex-1 border-2 border-black bg-black hover:bg-white hover:text-black"
					>
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	/**
	 * Renders a block explorer link for the submitted tx hash
	 * Reused across confirming, success, and failure steps
	 */
	function renderTxLink() {
		const url = getTxExplorerUrl();
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
					{step === 'select-chain' && renderChainSelector()}
					{step === 'connect-wallet' && renderWalletStep()}
					{step === 'review' && renderReviewStep()}
					{step === 'confirming' && renderConfirmingStep()}
					{step === 'success' && renderSuccessStep()}
					{step === 'failure' && renderFailureStep()}
				</div>
			</DialogContent>
		</Dialog>
	);
}
