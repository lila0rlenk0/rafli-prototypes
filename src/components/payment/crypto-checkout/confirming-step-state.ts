// ==========================================
// Types
// ==========================================

/**
 * Visual status for a single row in the confirming-step tracker.
 *
 * The tracker is intentionally linear: exactly one phase is "active" at a time.
 * That keeps the UI readable and avoids the "multiple spinners" regression where
 * overlapping async signals (receipt, confirmations, polling) all looked active.
 */
export type PhaseStatus = 'done' | 'active' | 'pending';

export interface ConfirmingPhase {
	detail: string | null;
	label: string;
	status: PhaseStatus;
}

interface BuildConfirmingPhasesInput {
	/** txHash exists once the wallet broadcast succeeds */
	txHash: string | undefined;
	/** Live confirmation count from wagmi */
	confirmations: number;
	/** Backend-matched threshold required before FE asks backend to finalize immediately */
	confirmationTarget: number;
	/**
	 * True once the backend accepted our explicit confirm/finalize request.
	 *
	 * Why this matters:
	 * - Before this, we are still in the "verifying payment" phase
	 * - After this, the payment is accepted and we're just waiting for order completion
	 * - This gives us a real phase boundary instead of abusing "receipt exists"
	 */
	finalizationRequested: boolean;
}

// ==========================================
// Helpers
// ==========================================

/**
 * Builds the four tracker rows for the crypto confirming UI.
 *
 * Phase progression is strictly sequential:
 * 1. Confirm in wallet
 * 2. Block confirmations
 * 3. Verifying payment
 * 4. Completing order
 *
 * Important constraint: only one phase may be active at once.
 * The parent modal has several overlapping async signals, but the tracker should
 * present one clear "current step" rather than expose implementation concurrency.
 */
export function buildConfirmingPhases({
	txHash,
	confirmations,
	confirmationTarget,
	finalizationRequested,
}: BuildConfirmingPhasesInput): ConfirmingPhase[] {
	const isBroadcast = !!txHash;
	const reachedTarget = confirmations >= confirmationTarget;
	const displayedConfirmations = reachedTarget
		? confirmationTarget
		: confirmations;
	const confirmationDetail =
		!isBroadcast || confirmations === 0
			? null
			: `${displayedConfirmations} / ${confirmationTarget} blocks`;

	return [
		{
			label: 'Confirm in wallet',
			status: isBroadcast ? 'done' : 'active',
			detail: null,
		},
		{
			label: 'Block confirmations',
			status: !isBroadcast ? 'pending' : reachedTarget ? 'done' : 'active',
			detail: confirmationDetail,
		},
		{
			label: 'Verifying payment',
			status: !reachedTarget
				? 'pending'
				: finalizationRequested
					? 'done'
					: 'active',
			detail: null,
		},
		{
			label: 'Completing order',
			status: finalizationRequested ? 'active' : 'pending',
			detail: null,
		},
	];
}
