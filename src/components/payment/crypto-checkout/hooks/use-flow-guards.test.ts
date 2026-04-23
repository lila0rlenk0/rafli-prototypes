import { describe, expect, test } from 'bun:test';

import { claimInFlightRef, type InFlightRef } from './use-flow-guards';

// ==========================================
// Fixtures
// ==========================================

/** Factory so every test gets a fresh ref — a shared literal would leak state. */
function makeRef(initial = false): InFlightRef {
	return { current: initial };
}

// ==========================================
// Tests
// ==========================================

describe('claimInFlightRef', () => {
	describe('first claim', () => {
		test('succeeds when the ref is false and flips it true', () => {
			const ref = makeRef(false);

			const result = claimInFlightRef(ref);

			expect(result.ok).toBe(true);
			expect(ref.current).toBe(true);
		});

		test('returns a release closure that resets the ref to false', () => {
			const ref = makeRef(false);

			const result = claimInFlightRef(ref);

			// Narrow the union for the happy path.
			if (!result.ok) throw new Error('expected ok=true for a fresh ref');
			result.release();

			expect(ref.current).toBe(false);
		});
	});

	describe('contested claim', () => {
		test('rejects when the ref is already true without mutating it', () => {
			// Same invariant `handlePay` / `handleWalletReady` depend on: a second
			// click while the first is still pending must never re-enter the flow.
			const ref = makeRef(true);

			const result = claimInFlightRef(ref);

			expect(result.ok).toBe(false);
			expect(ref.current).toBe(true);
		});
	});

	describe('release idempotency', () => {
		test('release after release still leaves the ref false', () => {
			// Double-release should never blow up — the flow-guard contract is
			// "call release exactly once", but we still want a second call to be
			// a harmless no-op so close/reset sequences stay safe.
			const ref = makeRef(false);
			const result = claimInFlightRef(ref);
			if (!result.ok) throw new Error('expected ok=true for a fresh ref');

			result.release();
			result.release();

			expect(ref.current).toBe(false);
		});
	});
});
