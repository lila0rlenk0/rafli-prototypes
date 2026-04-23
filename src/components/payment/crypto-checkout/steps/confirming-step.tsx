'use client';

import { Check, Loader2 } from 'lucide-react';

import {
	buildConfirmingPhases,
	type PhaseStatus,
} from '@/components/payment/crypto-checkout/steps/confirming-step-state';
import { TxLink } from '@/components/payment/crypto-checkout/steps/terminal-steps';
import { cn } from '@/lib/class-names';
import type { CryptoChainConfig } from '@/types/crypto-config';

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

/**
 * Confirming step — vertical 4-phase tracker (confirm wallet → confirmations → verify → complete).
 * Only one phase active at a time to prevent two-spinner overlap with the wallet popup.
 * Dots: done=solid black, active=pulsing, pending=gray outline.
 * Connecting lines fill black as phases complete.
 */
export function ConfirmingStep({
	txHash,
	selectedChainId,
	confirmations,
	confirmationTarget,
	finalizationRequested,
	chains,
}: ConfirmingStepProps) {
	// State machine lives in a pure helper for testability — enforces one-active-at-a-time rule
	const phases = buildConfirmingPhases({
		txHash,
		confirmations,
		confirmationTarget,
		finalizationRequested,
	});

	// done=solid black, active=pulsing ring, pending=gray outline
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
						<div className="border-ink-200 size-3 rounded-full border-2" />
					</div>
				);
		}
	}

	function getPhaseTextClass(status: PhaseStatus): string {
		const base = 'text-sm';
		return status === 'pending'
			? `${base} text-[#B4B4B4]`
			: `${base} font-medium text-black`;
	}

	function renderLine(nextStatus: PhaseStatus): React.ReactNode {
		const isFilled = nextStatus !== 'pending';
		return (
			<div
				className={cn(
					'ml-2.25 min-h-5 w-0.5 grow transition-colors duration-500',
					isFilled ? 'bg-black' : 'bg-ink-200',
				)}
			/>
		);
	}

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
								<span className={getPhaseTextClass(phase.status)}>
									{phase.label}
								</span>
								{phase.detail ? (
									<span className="text-ink-500 text-xs">{phase.detail}</span>
								) : null}
							</div>
							{/* Spinner on active phase */}
							{phase.status === 'active' ? (
								<Loader2 className="text-ink-500 ml-auto size-3.5 animate-spin" />
							) : null}
						</div>

						{/* Connecting line between phases (not after last) */}
						{(() => {
							const nextPhase = phases[i + 1];
							if (!nextPhase) return null;
							return renderLine(nextPhase.status);
						})()}
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
