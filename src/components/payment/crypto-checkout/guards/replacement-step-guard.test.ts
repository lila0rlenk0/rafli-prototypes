import { describe, expect, test } from 'bun:test';

import {
	dispatchReplacementWithStepGuard,
	type ReplacementDispatchArgs,
} from './replacement-step-guard';

// ==========================================
// Fixtures
// ==========================================

const REPLACEMENT_HASH =
	'0xabc1230000000000000000000000000000000000000000000000000000000099' as `0x${string}`;

interface Harness {
	handleReplacedCalls: number;
	reorgHandled: { current: boolean };
	releasePayInFlightCalls: number;
}

function buildHarness(): Harness {
	return {
		handleReplacedCalls: 0,
		// Prior replacement already handled, ref latched high — the guard
		// must not reset this when `uiStep !== 'confirming'`.
		reorgHandled: { current: true },
		releasePayInFlightCalls: 0,
	};
}

/** Wires a fresh harness into the dispatch args. */
function buildArgs(
	h: Harness,
	uiStep: ReplacementDispatchArgs['uiStep'],
): ReplacementDispatchArgs {
	return {
		uiStep,
		replacement: {
			reason: 'replaced',
			transaction: { hash: REPLACEMENT_HASH },
		},
		handleTransactionReplaced: () => {
			h.handleReplacedCalls += 1;
			return 'followed';
		},
		releasePayInFlight: () => {
			h.releasePayInFlightCalls += 1;
		},
		reorgHandledRef: h.reorgHandled,
	};
}

// ==========================================
// Tests
// ==========================================

describe('dispatchReplacementWithStepGuard — onReplaced step-guard race', () => {
	test('skips handleTransactionReplaced when step is not confirming', () => {
		// CONTRACT: `onReplaced` is registered on every render but fires
		// asynchronously. Between the wagmi poll firing and the callback's
		// microtask running, a parallel state update can move the modal
		// out of `confirming`. The guard MUST short-circuit so reorg logic
		// never runs on stale UI state — otherwise the failed-recovery
		// step or success step can silently get routed back to `review`.
		const h = buildHarness();

		const outcome = dispatchReplacementWithStepGuard(buildArgs(h, 'success'));

		expect(outcome).toBe('skipped');
		expect(h.handleReplacedCalls).toBe(0);
		// `reorgHandled` must stay latched — resetting it would falsely
		// re-arm the reorg effect for a now-resolved flow.
		expect(h.reorgHandled.current).toBe(true);
	});

	test('skips when step is already terminal (failure)', () => {
		// Same invariant, other terminal step.
		const h = buildHarness();

		const outcome = dispatchReplacementWithStepGuard(buildArgs(h, 'failure'));

		expect(outcome).toBe('skipped');
		expect(h.handleReplacedCalls).toBe(0);
	});

	test('runs the replacement handler when step is confirming', () => {
		// Negative baseline — happy path must still wire through exactly
		// as before.
		const h = buildHarness();

		const outcome = dispatchReplacementWithStepGuard(
			buildArgs(h, 'confirming'),
		);

		expect(outcome).toBe('followed');
		expect(h.handleReplacedCalls).toBe(1);
		// `followed` must reset the reorg idempotency ref so the reorg
		// effect can observe the new replacement hash cleanly.
		expect(h.reorgHandled.current).toBe(false);
	});
});
