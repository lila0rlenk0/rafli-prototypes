'use client';

import { useAppKit } from '@reown/appkit/react';
import { Loader2, ShieldCheck, WalletIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatNativeBalance, truncateAddress } from '@/lib/web3/format/format';

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

/**
 * Wallet connect + verify step for crypto checkout.
 *
 * When no wallet is connected, opens Reown AppKit's modal (supports 300+
 * wallets: MetaMask, Coinbase, Phantom, WalletConnect, social logins, etc.).
 *
 * Once connected, shows wallet address, verification status, and gas balance.
 *
 * @returns connect button or connected wallet info
 */
export function WalletStep({
	address,
	isWalletVerified,
	isProcessing,
	nativeBalance,
	onWalletReady,
}: WalletStepProps) {
	const { open } = useAppKit();
	const statusText = isWalletVerified
		? 'Wallet connected and verified'
		: 'Connect your wallet and verify ownership';
	const buttonText = isWalletVerified ? 'Continue' : 'Verify Wallet';

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
			<p className="text-ink-500 text-center text-sm">{statusText}</p>

			{/* Opens Reown AppKit modal — full wallet selection UI */}
			{!address ? (
				<Button
					onClick={() => {
						void open({ view: 'Connect' });
					}}
					variant="outline"
					className="h-12 w-full gap-3 border-2 border-black bg-white text-black hover:bg-black hover:text-white"
				>
					<WalletIcon className="size-5" />
					Connect Wallet
				</Button>
			) : null}

			{/* Connected wallet info card */}
			{address ? (
				<div className="border-ink-200 w-full rounded-2xl border p-5">
					<div className="flex flex-col gap-3">
						{/* Wallet address */}
						<div className="flex items-center justify-between">
							<span className="text-ink-500 text-sm">Wallet</span>
							<span className="font-mono text-sm font-medium">
								{truncateAddress(address)}
							</span>
						</div>

						{/* Verification status */}
						<div className="flex items-center justify-between">
							<span className="text-ink-500 text-sm">Status</span>
							{renderVerificationBadge()}
						</div>

						{/* Native token balance — needed for gas fees */}
						<div className="flex items-center justify-between">
							<span className="text-ink-500 text-sm">
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
					{buttonText}
				</Button>
			) : null}
		</div>
	);
}
