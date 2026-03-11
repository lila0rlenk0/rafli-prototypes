'use client';

import { Check, Loader2 } from 'lucide-react';

import { TxLink } from '@/components/payment/crypto-checkout/terminal-steps';

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
	/** Whether the tx receipt has been confirmed on-chain (triggers backend submission) */
	isTxConfirmed: boolean;
}

/**
 * Phase in the vertical step tracker.
 * Each phase transitions from pending → active → done as the flow progresses.
 */
type PhaseStatus = 'done' | 'active' | 'pending';

// ==========================================
// Component
// ==========================================

/**
 * Confirming step — vertical step tracker inspired by Safe's transaction flow.
 *
 * Four sequential phases connected by vertical lines:
 * 1. Transaction broadcast — immediately done (we're already in confirming)
 * 2. Block confirmations — shows live X/Y count, active until target reached
 * 3. Verifying payment — backend validates the tx against checkout session
 * 4. Completing order — backend finalizes order (transitions to success step)
 *
 * Each phase shows: dot (done=black, active=pulsing, pending=gray) + label + optional detail.
 * Connecting lines between dots fill black as phases complete.
 */
export function ConfirmingStep({
	txHash,
	selectedChainId,
	confirmations,
	confirmationTarget,
	isTxConfirmed,
}: ConfirmingStepProps) {
	// ==========================================
	// Phase Status Derivation
	// ==========================================

	/**
	 * Whether block confirmations have reached the chain's target.
	 * Reaching this threshold triggers the FE-driven finalization call
	 * (confirmCryptoTx) in the parent modal — not just UI progress.
	 */
	const reachedTarget = confirmations >= confirmationTarget;

	/**
	 * Detail text for the confirmations phase — shows live block count.
	 * Null when 0 confirmations (tx seen but not yet in a block).
	 * Clamps display to target when reached (avoids showing 15/12).
	 */
	function getConfirmationDetail(): string | null {
		if (confirmations === 0) return null;
		const display = reachedTarget ? confirmationTarget : confirmations;
		return `${display} / ${confirmationTarget} blocks`;
	}

	// ==========================================
	// Phase Definitions
	// ==========================================

	/**
	 * Ordered list of phases rendered in the vertical tracker.
	 *
	 * Status logic per phase:
	 * 1. Broadcast — always done (we only render after tx is sent)
	 * 2. Confirmations — active until target reached, then done
	 * 3. Verifying — pending until tx confirmed on-chain, then active
	 *    ("done" never visible — modal transitions to success step first)
	 * 4. Completing — pending until target reached + confirmed, then active
	 *    ("done" never visible — same reason as verifying)
	 */
	const phases: {
		label: string;
		status: PhaseStatus;
		detail: string | null;
	}[] = [
		{
			label: 'Transaction broadcast',
			status: 'done',
			detail: null,
		},
		{
			label: 'Block confirmations',
			status: reachedTarget ? 'done' : 'active',
			detail: getConfirmationDetail(),
		},
		{
			label: 'Verifying payment',
			status: isTxConfirmed ? 'active' : 'pending',
			detail: null,
		},
		{
			label: 'Completing order',
			status: reachedTarget && isTxConfirmed ? 'active' : 'pending',
			detail: null,
		},
	];

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
				<TxLink txHash={txHash} selectedChainId={selectedChainId} />
			</div>
		</div>
	);
}
