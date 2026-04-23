import { describe, expect, test } from 'bun:test';

import {
	getCheckoutStepTitle,
	getStepNumber,
	type CheckoutStep,
} from './step-progress';

// ==========================================
// Fixtures
// ==========================================

/**
 * Contract-drift injection — a literal value the `CheckoutStep` union
 * does not include. Cast through `as unknown as CheckoutStep` because
 * we are deliberately bypassing TypeScript's compile-time exhaustiveness
 * to prove the runtime switch throws instead of silently returning
 * `undefined`. Safe in test code: see `.claude/rules/code-style.md`
 * which permits `as unknown as T` casts for contract-drift injection.
 */
const UNKNOWN_STEP = 'nonexistent-step' as unknown as CheckoutStep;

// ==========================================
// Tests
// ==========================================

describe('step-progress — exhaustive switch safety', () => {
	test('getCheckoutStepTitle throws on unexpected step value', () => {
		// CONTRACT: if a future arm is added to `CheckoutStep` and this
		// switch misses it, the old `return _exhaustive` pattern silently
		// returned `undefined`, which then rendered as the empty string in
		// the Dialog header. The `throw` version makes the regression
		// loud so we catch it in tests, Sentry, and the console.
		expect(() =>
			getCheckoutStepTitle(UNKNOWN_STEP, { hasSelectableChains: true }),
		).toThrow();
	});

	test('getStepNumber throws on unexpected step value', () => {
		// Same invariant: silently returning `undefined` would then
		// evaluate to `NaN` in step-count arithmetic downstream.
		expect(() =>
			getStepNumber(UNKNOWN_STEP, {
				tokenStepShown: true,
				hasSelectableChains: true,
			}),
		).toThrow();
	});
});
