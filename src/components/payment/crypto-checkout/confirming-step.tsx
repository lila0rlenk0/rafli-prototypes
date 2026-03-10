'use client';

import { Loader2 } from 'lucide-react';

import { TxLink } from '@/components/payment/crypto-checkout/terminal-steps';

// ==========================================
// Types
// ==========================================

interface ConfirmingStepProps {
	txHash: string | undefined;
	/** Parent guarantees non-null — only renders when chain is selected */
	selectedChainId: number;
}

// ==========================================
// Component
// ==========================================

/**
 * Confirming step — shows spinner while backend verifies on-chain payment.
 * Displays tx explorer link so user can track confirmation externally.
 */
export function ConfirmingStep({
	txHash,
	selectedChainId,
}: ConfirmingStepProps) {
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
			<TxLink txHash={txHash} selectedChainId={selectedChainId} />
		</div>
	);
}
