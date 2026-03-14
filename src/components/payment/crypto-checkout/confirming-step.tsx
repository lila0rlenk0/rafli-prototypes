'use client';

import { Check, Loader2 } from 'lucide-react';

import {
	buildConfirmingPhases,
	type PhaseStatus,
} from '@/components/payment/crypto-checkout/confirming-step-state';
import { TxLink } from '@/components/payment/crypto-checkout/terminal-steps';
import type { CryptoChainConfig } from '@/types/crypto-config';

// ==========================================
// Types
// ==========================================

interface ConfirmingStepProps {
	txHash: string | undefined;
	/** Parent guarantees non-null — only renders when chain is selected */
	selectedChainId: number;
	/** Current number of block confirmations (0 = tx seen but not yet in a block) */
	confirmations: number;
	/** Target confirmations for this chain (e.g. 12 for L1, 2 for L2) */
	confirmationTarget: number;
	/** Whether backend accepted FE's explicit finalization request */
	finalizationRequested: boolean;
	/** Chain configs for explorer URL resolution */
	chains: CryptoChainConfig[];
}

// ==========================================
// Component
// ==========================================

/**
 * Confirming step — vertical step tracker inspired by Safe's transaction flow.
 *
 * Four sequential phases connected by vertical lines:
 * 1. Confirm in wallet — active while MetaMask/wallet is prompting, done once tx broadcast
 * 2. Block confirmations — shows live X/Y count, active until target reached
 * 3. Verifying payment — backend validates the tx against checkout session
 * 4. Completing order — backend finalizes order (transitions to success step)
 *
 * Only one phase is active at a time — prevents the "two spinners" issue
 * when the wallet popup coexists with the modal.
 *
 * Each phase shows: dot (done=black, active=pulsing, pending=gray) + label + optional detail.
 * Connecting lines between dots fill black as phases complete.
 */
export function ConfirmingStep({
	txHash,
	selectedChainId,
	confirmations,
	confirmationTarget,
	finalizationRequested,
	chains,
}: ConfirmingStepProps) {
	// ==========================================
	// Phase Definitions
	// ==========================================

	/**
	 * Ordered list of phases rendered in the vertical tracker.
	 *
	 * The state machine lives in a pure helper so we can test the sequencing rules:
	 * only one phase active, no receipt-driven overlap, and a real boundary between
	 * "verifying payment" and "completing order".
	 */
	const phases = buildConfirmingPhases({
		txHash,
		confirmations,
		confirmationTarget,
		finalizationRequested,
	});

	// ==========================================
	// Render Helpers
	// ==========================================

	/**
	 * Renders the status dot for a phase.
	 * - done: solid black dot with white checkmark
	 * - active: pulsing black dot (animated ring)
	 * - pending: gray outline dot
	 */
	function renderDot(status: PhaseStatus): React.ReactNode {
		switch (status) {
			case 'done':
				return (
					<div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black">
						<Check className="size-3 text-white" strokeWidth={3} />
					</div>
				);
			case 'active':
				return (
					<div className="relative flex size-5 shrink-0 items-center justify-center">
						<div className="absolute size-5 animate-ping rounded-full bg-black/10" />
						<div className="size-3 rounded-full bg-black" />
					</div>
				);
			case 'pending':
				return (
					<div className="flex size-5 shrink-0 items-center justify-center">
						<div className="size-3 rounded-full border-2 border-[#E5E5E5]" />
					</div>
				);
		}
	}

	/**
	 * Renders the connecting line between two phase dots.
	 * Filled (black) when the next phase is done or active; gray when pending.
	 */
	function renderLine(nextStatus: PhaseStatus): React.ReactNode {
		const isFilled = nextStatus !== 'pending';
		return (
			<div
				className={`ml-[9px] w-0.5 grow transition-colors duration-500 ${
					isFilled ? 'bg-black' : 'bg-[#E5E5E5]'
				}`}
				// Min height ensures line is visible even between short labels
				style={{ minHeight: 20 }}
			/>
		);
	}

	// ==========================================
	// Render
	// ==========================================

	return (
		<div className="flex flex-col gap-4 py-4">
			{/* Vertical step tracker */}
			<div className="flex flex-col px-2">
				{phases.map((phase, i) => (
					<div key={phase.label} className="flex flex-col">
						{/* Phase row: dot + label + detail */}
						<div className="flex items-center gap-3">
							{renderDot(phase.status)}
							<div className="flex flex-col">
								<span
									className={`text-sm ${
										phase.status === 'pending'
											? 'text-[#B4B4B4]'
											: 'font-medium text-black'
									}`}
								>
									{phase.label}
								</span>
								{phase.detail && (
									<span className="text-xs text-[#7B7B7B]">{phase.detail}</span>
								)}
							</div>
							{/* Spinner on active phase */}
							{phase.status === 'active' && (
								<Loader2 className="ml-auto size-3.5 animate-spin text-[#7B7B7B]" />
							)}
						</div>

						{/* Connecting line between phases (not after last) */}
						{i < phases.length - 1 && renderLine(phases[i + 1]!.status)}
					</div>
				))}
			</div>

			{/* Tx explorer link — centered below the tracker */}
			<div className="flex justify-center pt-1">
				<TxLink
					txHash={txHash}
					selectedChainId={selectedChainId}
					chains={chains}
				/>
			</div>
		</div>
	);
}
