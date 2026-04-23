import type { CheckoutStep } from '@/components/payment/crypto-checkout/steps/step-progress';

// ==========================================
// Types
// ==========================================

export type ReplacementHandlerOutcome = 'unwound' | 'followed';

/** Minimal wagmi-shaped replacement event — only what the handler reads. */
export interface WagmiReplacementEvent {
	reason: 'cancelled' | 'replaced' | 'repriced';
	transaction: { hash: `0x${string}` };
}

export interface ReplacementDispatchArgs {
	/** Current checkout step at the moment `onReplaced` fires. */
	uiStep: CheckoutStep;
	replacement: WagmiReplacementEvent;
	/** tx-tracking's `handleTransactionReplaced` — side-effectful. */
	handleTransactionReplaced: (args: {
		reason: WagmiReplacementEvent['reason'];
		newHash: `0x${string}`;
		releasePayInFlight: () => void;
	}) => ReplacementHandlerOutcome;
	releasePayInFlight: () => void;
	/** fe-confirmation's reorg-handled idempotency ref. */
	reorgHandledRef: { current: boolean };
}

// ==========================================
// Dispatcher
// ==========================================

/**
 * Dispatches a wagmi `onReplaced` event into tx-tracking + fe-confirmation.
 *
 * Why the extra `uiStep` guard: wagmi's `useWaitForTransactionReceipt`
 * gates its query via `{ enabled: uiStep === 'confirming' && !!txHash }`,
 * but `onReplaced` is a Promise-like callback registered at hook wire
 * time. If the step transitions out of `confirming` between the
 * poll firing and the callback's microtask running, the callback
 * still fires with whatever refs it captured. Dispatching replacement
 * logic onto stale UI state would re-route a dismissed flow back to
 * `review` or leak setters onto an unmounted tree.
 *
 * This pure guard short-circuits on any non-`confirming` step so the
 * tx-tracking side effects never run outside the intended window.
 *
 * @param args - Current step, wagmi event, side-effect callables
 * @returns `'followed'` / `'unwound'` from `handleTransactionReplaced`,
 *   or `'skipped'` when the step guard fires.
 */
export function dispatchReplacementWithStepGuard(
	args: ReplacementDispatchArgs,
): ReplacementHandlerOutcome | 'skipped' {
	// Step guard: wagmi's `useWaitForTransactionReceipt` gates polling via
	// `{ enabled: uiStep === 'confirming' && !!txHash }`, but `onReplaced`
	// is a callback registered at hook wire time and can fire after the
	// step has already moved past `confirming` (e.g. parallel
	// `applyServerHydration` routed the flow to `failure` / `success`).
	// Running the replacement handler on stale UI state silently re-routes
	// the dismissed flow back to `review` and leaks setters onto an
	// unmounted tree.
	if (args.uiStep !== 'confirming') {
		return 'skipped';
	}

	const outcome = args.handleTransactionReplaced({
		reason: args.replacement.reason,
		newHash: args.replacement.transaction.hash,
		releasePayInFlight: args.releasePayInFlight,
	});

	// On `followed`, reset the reorg idempotency ref so the reorg effect
	// can fire again for the replacement hash. Unwind paths already reset
	// via `applyRuntimeState` (→ `fe.resetConfirmation`).
	if (outcome === 'followed') {
		args.reorgHandledRef.current = false;
	}

	return outcome;
}
