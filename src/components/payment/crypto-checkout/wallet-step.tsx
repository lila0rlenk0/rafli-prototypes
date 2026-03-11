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
 */
export function WalletStep({
	address,
	isWalletVerified,
	isProcessing,
	nativeBalance,
	onWalletReady,
}: WalletStepProps) {
	/**
	 * Gets status label text based on wallet verification
	 */
	function getStatusText(): string {
		return isWalletVerified
			? 'Wallet connected and verified'
			: 'Connect your wallet and verify ownership';
	}

	/**
	 * Gets button label — "Continue" if already verified, else "Verify Wallet"
	 */
	function getButtonText(): string {
		return isWalletVerified ? 'Continue' : 'Verify Wallet';
	}

	return (
		<div className="flex flex-col items-center gap-5">
			<p className="text-center text-sm text-[#7B7B7B]">{getStatusText()}</p>

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
			)}

			{/* Verify / Continue button */}
			{address && (
				<Button
					onClick={onWalletReady}
					disabled={isProcessing}
					className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
				>
					{isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
					{getButtonText()}
				</Button>
			)}
		</div>
	);
}
