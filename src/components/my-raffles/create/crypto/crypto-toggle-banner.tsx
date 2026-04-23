'use client';

import { InfoIcon, Wallet } from 'lucide-react';

import { Switch } from '@/components/ui/switch';

interface CryptoToggleBannerProps {
	/** Whether crypto payments are currently enabled on the raffle form. */
	acceptsCrypto: boolean;
	/** Fired when the host flips the accept-crypto switch. */
	onAcceptsCryptoChange: (checked: boolean) => void;
}

/**
 * Header row of the crypto config card: wallet icon + title + switch, plus a
 * muted info row rendered only when the toggle is off to confirm that only
 * Stripe will be offered. Kept in one component so the toggle and its
 * collapsed-state hint move together when the copy changes.
 *
 * @returns Toggle + collapsed-state banner JSX.
 */
export function CryptoToggleBanner({
	acceptsCrypto,
	onAcceptsCryptoChange,
}: CryptoToggleBannerProps) {
	return (
		<>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Wallet className="size-5 text-gray-600" aria-hidden="true" />
					<div>
						<h2 className="text-xl font-semibold">Crypto Payments</h2>
						<p className="text-sm text-gray-500">
							Accept ERC-20 token payments alongside card
						</p>
					</div>
				</div>
				<Switch
					checked={acceptsCrypto}
					onCheckedChange={onAcceptsCryptoChange}
					aria-label="Accept crypto payments"
				/>
			</div>

			{acceptsCrypto ? null : (
				<div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
					<InfoIcon className="size-4 text-gray-400" aria-hidden="true" />
					<span className="text-sm text-gray-500">
						Only card payments (Stripe) will be available
					</span>
				</div>
			)}
		</>
	);
}
