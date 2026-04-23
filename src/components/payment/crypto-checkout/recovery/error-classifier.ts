import {
	getWalletTransferErrorMessage,
	isUserRejection,
	isWalletFeeCapTooLow,
} from '@/lib/web3/errors';

/**
 * Classification of a throw from `handlePay`'s try-block.
 *
 * The classifier is pure — callers own the side effects (toast, Sentry,
 * step transitions). Each branch carries just enough data to drive those
 * effects without leaking the wagmi/viem error shape past this boundary.
 *
 * - `broadcasted-needs-recovery`: a tx hash was already broadcast before
 *   the throw. Funds are in flight; do NOT reset `txSubmitted`, keep the
 *   user on `confirming`, and let the RETRY submit-recovery path + polling
 *   reconcile with backend.
 * - `user-rejection`: wallet popup was dismissed. Safe to drop back to
 *   review with an informational toast — no funds left the wallet.
 * - `fee-cap-too-low`: transient EIP-1559 base-fee movement. Retryable;
 *   keep the user on review with a specific toast, not terminal failure.
 * - `wallet-error`: everything else — generic wallet/RPC infra failure.
 *   Surface a terminal failure screen with the mapped wallet message.
 */
export type PayErrorClassification =
	| { kind: 'broadcasted-needs-recovery'; broadcastTxHash: `0x${string}` }
	| { kind: 'user-rejection' }
	| { kind: 'fee-cap-too-low'; message: string }
	| { kind: 'wallet-error'; message: string };

/**
 * Classifies an error thrown inside `handlePay` into the exact recovery
 * branch the modal should take.
 *
 * Order of checks matters:
 * 1. `broadcastTxHash` trumps every wallet-layer signal — once a hash has
 *    been broadcast, `sendTransactionAsync` has already resolved, so even
 *    a later `UserRejectedRequestError` from the receipt layer must not
 *    drop the user back to review (double-payment hazard).
 * 2. User rejection is checked before fee-cap/wallet-error so a cancelled
 *    prompt doesn't surface a noisy Sentry-tagged terminal error.
 * 3. Fee-cap-too-low is kept retryable separately from generic wallet
 *    failures — volatile base-fee movement is a transient condition, not
 *    a checkout invariant break.
 *
 * @param error - Unknown error thrown from the wallet/RPC layer
 * @param broadcastTxHash - Hash captured after `sendTransactionAsync`
 *   resolved, or `undefined` when the throw happened before broadcast
 * @returns Discriminated classification describing the recovery branch
 */
export function classifyPayError(
	error: unknown,
	broadcastTxHash: `0x${string}` | undefined,
): PayErrorClassification {
	// Step 1: broadcast-after-throw is load-bearing — funds are in flight,
	//         so we MUST NOT rewind to review even if the error would
	//         otherwise look like a user rejection.
	if (broadcastTxHash) {
		return { kind: 'broadcasted-needs-recovery', broadcastTxHash };
	}

	// Step 2: user-cancelled wallet prompt — handled as an info toast, not
	//         as a terminal failure path.
	if (isUserRejection(error)) {
		return { kind: 'user-rejection' };
	}

	// Step 3: transient EIP-1559 fee-cap mismatch — retryable on review.
	if (isWalletFeeCapTooLow(error)) {
		return {
			kind: 'fee-cap-too-low',
			message: getWalletTransferErrorMessage(error),
		};
	}

	// Step 4: generic wallet/RPC infra failure — terminal failure screen.
	return {
		kind: 'wallet-error',
		message: getWalletTransferErrorMessage(error),
	};
}
