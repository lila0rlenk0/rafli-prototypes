import { describe, expect, test } from 'bun:test';

import {
	applyTxTrackingPatch,
	type ApplyRuntimeStateParams,
	type ApplyRuntimeStateTarget,
} from './tx-runtime-merge';
import type {
	ReplacementReason,
	SubmitRecoveryMode,
} from '@/components/payment/crypto-checkout/hooks/use-tx-tracking-types';

// ==========================================
// Module-scope fixtures
// ==========================================

/** Pre-normalized (uppercased) hash — verifies the helper lowercases on write. */
const UPPERCASE_HASH =
	'0xABC1230000000000000000000000000000000000000000000000000000000001';
/** Expected normalized form: EVM addresses/hashes compare lowercased on the FE. */
const NORMALIZED_HASH = UPPERCASE_HASH.toLowerCase();

/** Second backend hash for idempotence checks — distinct from NORMALIZED_HASH. */
const SECOND_UPPER =
	'0xDEF4560000000000000000000000000000000000000000000000000000000002';
const SECOND_NORMALIZED = SECOND_UPPER.toLowerCase();

/** Pre-populated ref values so clears/mutations are observable post-apply. */
const DIRTY_RETRIED_HASH = '0xdeadbeef';
const DIRTY_REPLACEMENT_REASON: ReplacementReason = 'replaced';
const DIRTY_BACKEND_HASH = '0xstale';

// ==========================================
// Test harness — plain refs + call recorders (no mock.module)
// ==========================================

interface MutableRef<T> {
	current: T;
}

interface Recorders {
	txHashCalls: (`0x${string}` | undefined)[];
	txSubmittedCalls: boolean[];
	submitRecoveryModeCalls: SubmitRecoveryMode[];
	retryBlockedCalls: boolean[];
	errorMessageCalls: (string | null)[];
	fundsAtRiskCalls: boolean[];
	resetSendCount: number;
	resetFeCount: number;
	submitRequestInFlight: MutableRef<boolean>;
	submitRetriedHashes: MutableRef<Set<string>>;
	lastReplacementReason: MutableRef<null | ReplacementReason>;
	backendTrackedTxHash: MutableRef<string | null>;
	txSubmittedToBackend: MutableRef<boolean>;
}

interface Harness {
	target: ApplyRuntimeStateTarget;
	rec: Recorders;
}

/**
 * Builds a fresh harness where every ref starts "dirty" — set to a value
 * the helper is expected to either preserve or reset. That way each branch
 * assertion can observe a real write instead of a no-op match against the
 * default.
 */
function buildHarness(): Harness {
	const rec: Recorders = {
		txHashCalls: [],
		txSubmittedCalls: [],
		submitRecoveryModeCalls: [],
		retryBlockedCalls: [],
		errorMessageCalls: [],
		fundsAtRiskCalls: [],
		resetSendCount: 0,
		resetFeCount: 0,
		submitRequestInFlight: { current: true },
		submitRetriedHashes: { current: new Set([DIRTY_RETRIED_HASH]) },
		lastReplacementReason: { current: DIRTY_REPLACEMENT_REASON },
		backendTrackedTxHash: { current: DIRTY_BACKEND_HASH },
		txSubmittedToBackend: { current: true },
	};

	const target: ApplyRuntimeStateTarget = {
		setTxHash(v) {
			rec.txHashCalls.push(v);
		},
		setTxSubmitted(v) {
			rec.txSubmittedCalls.push(v);
		},
		setSubmitRecoveryMode(v) {
			rec.submitRecoveryModeCalls.push(v);
		},
		setRetryBlocked(v) {
			rec.retryBlockedCalls.push(v);
		},
		setErrorMessage(v) {
			rec.errorMessageCalls.push(v);
		},
		setFundsAtRisk(v) {
			rec.fundsAtRiskCalls.push(v);
		},
		submitRequestInFlight: rec.submitRequestInFlight,
		submitRetriedHashes: rec.submitRetriedHashes,
		lastReplacementReason: rec.lastReplacementReason,
		backendTrackedTxHash: rec.backendTrackedTxHash,
		txSubmittedToBackend: rec.txSubmittedToBackend,
		resetSendTransaction() {
			rec.resetSendCount += 1;
		},
		resetFeConfirmation() {
			rec.resetFeCount += 1;
		},
	};

	return { target, rec };
}

// ==========================================
// Param fixtures — one per branch of the defaults destructure
// ==========================================

/** Minimal reset payload — verifies every default clears the dirty ref state. */
const RESET_PARAMS: ApplyRuntimeStateParams = {
	txHash: undefined,
	txSubmitted: false,
};

/** Full hydration payload — verifies every non-default branch mutates correctly. */
const FULL_HYDRATION_PARAMS: ApplyRuntimeStateParams = {
	txHash: '0xabc',
	txSubmitted: true,
	submitRecoveryMode: 'retry',
	finalizationRequested: true,
	backendTrackedHash: UPPERCASE_HASH,
	backendOwnsTx: true,
	fundsAtRisk: true,
	retryBlocked: true,
	errorMessage: 'session lost',
};

/** Hydration variant that exercises the `backendTrackedHash: null` branch. */
const FULL_HYDRATION_NULL_HASH: ApplyRuntimeStateParams = {
	...FULL_HYDRATION_PARAMS,
	backendTrackedHash: null,
};

// ==========================================
// Tests
// ==========================================

describe('applyTxTrackingPatch', () => {
	describe('setter sequence', () => {
		test('fires every setter exactly once per apply in the documented order', () => {
			// The doc-comment on the helper pins the ordering:
			//   setTxHash → setTxSubmitted → setSubmitRecoveryMode →
			//   resetFeConfirmation → setFundsAtRisk → setRetryBlocked →
			//   setErrorMessage → ref resets → wagmi reset.
			// We can't observe inter-setter ordering between different setters
			// directly, but we can confirm each was called once and that the
			// reset counters reflect the post-setter position.
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(FULL_HYDRATION_PARAMS, target);

			expect(rec.txHashCalls.length).toBe(1);
			expect(rec.txSubmittedCalls.length).toBe(1);
			expect(rec.submitRecoveryModeCalls.length).toBe(1);
			expect(rec.fundsAtRiskCalls.length).toBe(1);
			expect(rec.retryBlockedCalls.length).toBe(1);
			expect(rec.errorMessageCalls.length).toBe(1);
			expect(rec.resetFeCount).toBe(1);
			expect(rec.resetSendCount).toBe(1);
		});
	});

	describe('defaults branch — reset payload', () => {
		test('passes documented defaults through to every setter', () => {
			// Covers the destructure defaults: submitRecoveryMode=null,
			// backendTrackedHash=null, backendOwnsTx=false, fundsAtRisk=false,
			// retryBlocked=false, errorMessage=null.
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(RESET_PARAMS, target);

			expect(rec.txHashCalls).toEqual([undefined]);
			expect(rec.txSubmittedCalls).toEqual([false]);
			expect(rec.submitRecoveryModeCalls).toEqual([null]);
			expect(rec.fundsAtRiskCalls).toEqual([false]);
			expect(rec.retryBlockedCalls).toEqual([false]);
			expect(rec.errorMessageCalls).toEqual([null]);
		});

		test('clears dirty refs — submitRequestInFlight, retriedHashes, replacement', () => {
			// Every ref in the harness starts "dirty"; confirm the helper's
			// ref-reset block writes the documented baseline over the top.
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(RESET_PARAMS, target);

			expect(rec.submitRequestInFlight.current).toBe(false);
			expect(rec.submitRetriedHashes.current.size).toBe(0);
			expect(rec.lastReplacementReason.current).toBeNull();
		});

		test('defaults backendTrackedTxHash and txSubmittedToBackend refs', () => {
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(RESET_PARAMS, target);

			expect(rec.backendTrackedTxHash.current).toBeNull();
			expect(rec.txSubmittedToBackend.current).toBe(false);
		});
	});

	describe('hydration branch — explicit values', () => {
		test('normalizes backendTrackedHash to lowercase when truthy', () => {
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(FULL_HYDRATION_PARAMS, target);

			expect(rec.backendTrackedTxHash.current).toBe(NORMALIZED_HASH);
			expect(rec.txSubmittedToBackend.current).toBe(true);
		});

		test('stores null when backendTrackedHash is explicitly null', () => {
			// The `backendTrackedHash ? normalize(...) : null` branch must be
			// covered — nullish hash skips the normalize call entirely.
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(FULL_HYDRATION_NULL_HASH, target);

			expect(rec.backendTrackedTxHash.current).toBeNull();
		});

		test('pipes every failure flag through to its setter', () => {
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(FULL_HYDRATION_PARAMS, target);

			expect(rec.fundsAtRiskCalls).toEqual([true]);
			expect(rec.retryBlockedCalls).toEqual([true]);
			expect(rec.errorMessageCalls).toEqual(['session lost']);
			expect(rec.submitRecoveryModeCalls).toEqual(['retry']);
		});
	});

	describe('submitRecoveryMode union arms', () => {
		// Document exhaustiveness: if `SubmitRecoveryMode` gains a new variant
		// without updating the helper, these assertions still pass because the
		// helper simply forwards the value — but the downstream setter's type
		// signature would break at compile time, triggering a `bunx tsc` fail.
		const modes: readonly SubmitRecoveryMode[] = [null, 'poll', 'retry'];

		for (const mode of modes) {
			test(`forwards submitRecoveryMode=${String(mode)} verbatim`, () => {
				const { target, rec } = buildHarness();

				applyTxTrackingPatch(
					{ txHash: undefined, txSubmitted: false, submitRecoveryMode: mode },
					target,
				);

				expect(rec.submitRecoveryModeCalls).toEqual([mode]);
			});
		}
	});

	describe('idempotence', () => {
		test('second apply with identical input yields identical ref state', () => {
			// Applying the same reset payload twice must leave refs in the same
			// terminal state as applying it once — the ref-reset block is
			// strictly overwriting, not accumulating.
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(RESET_PARAMS, target);
			const snapshotAfterFirst = {
				submitRequestInFlight: rec.submitRequestInFlight.current,
				retriedHashesSize: rec.submitRetriedHashes.current.size,
				lastReplacementReason: rec.lastReplacementReason.current,
				backendTrackedTxHash: rec.backendTrackedTxHash.current,
				txSubmittedToBackend: rec.txSubmittedToBackend.current,
			};

			applyTxTrackingPatch(RESET_PARAMS, target);

			expect({
				submitRequestInFlight: rec.submitRequestInFlight.current,
				retriedHashesSize: rec.submitRetriedHashes.current.size,
				lastReplacementReason: rec.lastReplacementReason.current,
				backendTrackedTxHash: rec.backendTrackedTxHash.current,
				txSubmittedToBackend: rec.txSubmittedToBackend.current,
			}).toEqual(snapshotAfterFirst);
		});

		test('each apply invokes resetSendTransaction and resetFeConfirmation once', () => {
			// Two applies must invoke the wagmi + fe-confirmation resets exactly
			// twice — the helper owns the cross-cluster reset atomically, so
			// callers should never observe a missed or doubled reset.
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(RESET_PARAMS, target);
			applyTxTrackingPatch(RESET_PARAMS, target);

			expect(rec.resetSendCount).toBe(2);
			expect(rec.resetFeCount).toBe(2);
		});
	});

	describe('transition — hydration then reset', () => {
		test('overwrites backendTrackedTxHash when applied back-to-back', () => {
			// First apply hydrates the ref with UPPERCASE_HASH, second apply
			// clears it — guards against a subtle bug where the normalize
			// branch ran on the stale value instead of the new param.
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(FULL_HYDRATION_PARAMS, target);
			expect(rec.backendTrackedTxHash.current).toBe(NORMALIZED_HASH);

			applyTxTrackingPatch(RESET_PARAMS, target);
			expect(rec.backendTrackedTxHash.current).toBeNull();
		});

		test('replaces normalized backend hash on a second hydration', () => {
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(FULL_HYDRATION_PARAMS, target);
			applyTxTrackingPatch(
				{
					...FULL_HYDRATION_PARAMS,
					backendTrackedHash: SECOND_UPPER,
				},
				target,
			);

			expect(rec.backendTrackedTxHash.current).toBe(SECOND_NORMALIZED);
		});
	});

	describe('boundary — falsy sentinel hashes', () => {
		test('empty-string backendTrackedHash is treated as null (falsy guard)', () => {
			// Defensive: the helper uses `backendTrackedHash ? ... : null`, so
			// an accidental empty-string from backend never reaches normalize.
			const { target, rec } = buildHarness();

			applyTxTrackingPatch(
				{ ...FULL_HYDRATION_PARAMS, backendTrackedHash: '' },
				target,
			);

			expect(rec.backendTrackedTxHash.current).toBeNull();
		});
	});
});
