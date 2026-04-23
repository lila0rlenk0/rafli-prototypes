/**
 * Replacement reasons surfaced by wagmi's `onReplaced` receipt callback.
 *
 * Kept here (rather than imported from the modal) so this helper has no
 * dependency on the giant component file — the factories need the string
 * union only to branch the user-facing copy for `failBackendTrackedReplacement`.
 */
export type TerminalReplacementReason = 'cancelled' | 'replaced' | 'repriced';

/**
 * Setter surface the terminal-failure factories need from the modal.
 *
 * Inferred directly from the actual setState calls in the modal's three
 * failure handlers (lines 370–430). Kept as a minimal interface so unit
 * tests can inject plain spy functions without having to emulate the full
 * modal.
 */
export interface TerminalSetters {
	setSubmitRecoveryMode: (mode: null) => void;
	setRetryBlocked: (blocked: boolean) => void;
	setFundsAtRisk: (atRisk: boolean) => void;
	setErrorMessage: (message: string) => void;
	/**
	 * Transition the modal into the `failure` step.
	 *
	 * Narrowed to the literal `'failure'` so callers can pass the modal's
	 * `goToStep` without widening this helper's contract to the full
	 * `CheckoutStep` union.
	 */
	goToFailureStep: () => void;
}

/**
 * Context read by `failConfirmingWindowExpired` to pick between the
 * "funds may be in flight" copy and the plain session-expiry copy.
 *
 * The original inline handler reads two refs + the `txHash` state; we
 * surface them explicitly here so the helper stays pure and the caller
 * can snapshot the live values at the moment the timeout fires.
 */
export interface ConfirmingWindowContext {
	successAlreadyTransitioned: boolean;
	txSubmittedToBackend: boolean;
	txHash: `0x${string}` | undefined;
}

/**
 * Factory for the terminal-failure handler fired when the wallet has
 * broadcast a tx but the backend could not safely register it.
 *
 * Hard stop: a transfer already happened, backend PR 40 only finalizes
 * against the stored session hash, and retrying would risk double
 * payments or misleading UX.
 *
 * @param setters - Subset of modal setters the terminal state requires
 * @returns A side-effectful callback that flips the modal into the
 *   "funds at risk / contact support" failure path
 */
export function failSubmittedTxRegistration(
	setters: TerminalSetters,
): () => void {
	return function failSubmittedTxRegistrationHandler() {
		setters.setSubmitRecoveryMode(null);
		setters.setRetryBlocked(true);
		setters.setFundsAtRisk(true);
		setters.setErrorMessage(
			'Transaction was sent, but the server could not safely register it. Please contact support with your transaction hash.',
		);
		setters.goToFailureStep();
	};
}

/**
 * Factory for the terminal-failure handler fired when wagmi reports the
 * wallet replaced or cancelled a tx the backend had already bound to
 * this session.
 *
 * Backend PR 40 treats the first accepted tx hash as the session's
 * source of truth. A replacement to a different hash cannot be
 * reconciled client-side — the copy splits on `cancelled` (no funds
 * left the wallet yet) vs. `replaced/repriced` (funds likely in flight
 * on the new hash, support must reconcile).
 *
 * @param setters - Subset of modal setters the terminal state requires
 * @returns A callback taking the replacement reason and transitioning
 *   into the appropriate copy for the failure screen
 */
export function failBackendTrackedReplacement(
	setters: TerminalSetters,
): (reason: TerminalReplacementReason | null) => void {
	return function failBackendTrackedReplacementHandler(reason) {
		setters.setSubmitRecoveryMode(null);
		setters.setRetryBlocked(true);

		if (reason === 'cancelled') {
			setters.setFundsAtRisk(false);
			setters.setErrorMessage(
				'Your wallet cancelled the original transaction after the server had already registered it. Please wait for the checkout session to clear, then try again.',
			);
		} else {
			setters.setFundsAtRisk(true);
			setters.setErrorMessage(
				'Your wallet replaced the original transaction after the server had already registered it. Please contact support with your transaction hash.',
			);
		}

		setters.goToFailureStep();
	};
}

/**
 * Factory for the terminal-failure handler fired when the backend
 * confirming/submit grace window expires.
 *
 * Copy differs between "payment may still be in flight on-chain"
 * (backend already knew about the hash or we have a local one) and
 * plain "session expired, please try again" (never broadcast). The
 * `successAlreadyTransitioned` guard prevents a late timer from
 * overwriting a fresh success with a fake expiry.
 *
 * @param setters - Subset of modal setters the terminal state requires
 * @returns A callback taking a live-state snapshot and transitioning
 *   into the correct expiry copy — or no-ops when success already fired
 */
export function failConfirmingWindowExpired(
	setters: TerminalSetters,
): (context: ConfirmingWindowContext) => void {
	return function failConfirmingWindowExpiredHandler(context) {
		if (context.successAlreadyTransitioned) return;

		if (context.txSubmittedToBackend || !!context.txHash) {
			setters.setErrorMessage(
				'Payment verification timed out. Your transaction may still be processing — please check your order history or contact support.',
			);
		} else {
			setters.setErrorMessage('Checkout session expired. Please try again.');
		}

		setters.goToFailureStep();
	};
}
