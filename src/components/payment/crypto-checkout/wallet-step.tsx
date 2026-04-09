'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatNativeBalance, truncateAddress } from '@/lib/web3/format';

// ==========================================
// Types
// ==========================================

interface WalletStepProps {
	address: string | undefined;
	isWalletVerified: boolean;
	isProcessing: boolean;
	/** Native balance data from wagmi useBalance — shown as gas indicator */
	nativeBalance:
		| { value: bigint; decimals: number; symbol?: string }
		| undefined;
	onWalletReady: () => void;
}

// ==========================================
// Component
// ==========================================

/**
 * Wallet connect + verify step for crypto checkout.
 * Uses ConnectButton.Custom for consistent styling within the modal.
 * Shows wallet address, verification status, and gas balance.
 *
 * ConnectButton.Custom render props (from RainbowKit docs):
 * - mounted: boolean — whether the widget has hydrated
 * - authenticationStatus: 'loading' | 'unauthenticated' | 'authenticated' | undefined
 * - openConnectModal: () => void — opens the wallet selection modal
 * - account: { address, displayName, displayBalance, ... } | undefined
 * - chain: { id, name, unsupported, ... } | undefined
 *
 * @returns wallet connection step UI
 */
export function WalletStep({
	address,
	isWalletVerified,
	isProcessing,
	nativeBalance,
	onWalletReady,
}: WalletStepProps) {
	/**
	 * @returns status label text based on wallet verification state
	 */
	function getStatusText(): string {
		return isWalletVerified
			? 'Wallet connected and verified'
			: 'Connect your wallet and verify ownership';
	}

	/**
	 * @returns "Continue" if already verified, else "Verify Wallet"
	 */
	function getButtonText(): string {
		return isWalletVerified ? 'Continue' : 'Verify Wallet';
	}

	/**
	 * @returns green checkmark badge if verified, amber text if not
	 */
	function renderVerificationBadge(): React.ReactNode {
		if (isWalletVerified) {
			return (
				<span className="flex items-center gap-1 text-sm font-medium text-green-600">
					<ShieldCheck className="size-3.5" />
					Verified
				</span>
			);
		}
		return <span className="text-sm text-amber-600">Needs verification</span>;
	}

	return (
		<div className="flex flex-col items-center gap-5">
			<p className="text-center text-sm text-[#7B7B7B]">{getStatusText()}</p>

			{/* Custom connect button — styled to match app.
			    RainbowKit docs: check mounted + authenticationStatus for readiness,
			    guard openConnectModal with optional chaining. */}
			{!address ? (
				<ConnectButton.Custom>
					{({ openConnectModal, mounted, authenticationStatus }) => {
						// RainbowKit does not guarantee modal handlers exist before the
						// widget is mounted/auth state is resolved. Render a disabled CTA
						// until the modal can actually open instead of a dead button.
						const isReady = mounted && authenticationStatus !== 'loading';
						const canOpenModal = isReady && !!openConnectModal;

						return (
							// Hide from assistive tech until RainbowKit is ready
							// (recommended pattern from RainbowKit docs)
							<div
								{...(!isReady && {
									'aria-hidden': true,
									style: {
										opacity: 0,
										pointerEvents: 'none' as const,
										userSelect: 'none' as const,
										width: '100%',
									},
								})}
								className="w-full"
							>
								<Button
									onClick={() => openConnectModal?.()}
									disabled={!canOpenModal}
									variant="outline"
									className="h-12 w-full border-2 border-black bg-white text-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-[#D4D4D4] disabled:bg-[#F5F5F5] disabled:text-[#7B7B7B] disabled:hover:bg-[#F5F5F5] disabled:hover:text-[#7B7B7B]"
								>
									{canOpenModal ? 'Connect Wallet' : 'Preparing wallet...'}
								</Button>
							</div>
						);
					}}
				</ConnectButton.Custom>
			) : null}

			{/* Connected wallet info card */}
			{address ? (
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
							{renderVerificationBadge()}
						</div>

						{/* Native token balance — needed for gas fees */}
						<div className="flex items-center justify-between">
							<span className="text-sm text-[#7B7B7B]">
								{nativeBalance?.symbol ?? 'ETH'} balance
							</span>
							<span className="text-sm font-medium">
								{formatNativeBalance(nativeBalance)}{' '}
								{nativeBalance?.symbol ?? 'ETH'}
							</span>
						</div>
					</div>
				</div>
			) : null}

			{/* Verify / Continue button */}
			{address ? (
				<Button
					onClick={onWalletReady}
					disabled={isProcessing}
					className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
				>
					{isProcessing ? (
						<Loader2 className="mr-2 size-4 animate-spin" />
					) : null}
					{getButtonText()}
				</Button>
			) : null}
		</div>
	);
}
