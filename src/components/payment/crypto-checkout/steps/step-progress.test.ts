import { describe, expect, test } from 'bun:test';

import {
	getCheckoutStepTitle,
	getStepNumber,
	getTotalSteps,
	wasTokenStepShown,
} from './step-progress';

// ==========================================
// Tests
// ==========================================

describe('getCheckoutStepTitle', () => {
	test('select-chain surfaces the unavailable variant when no chain is renderable', () => {
		expect(
			getCheckoutStepTitle('select-chain', { hasSelectableChains: false }),
		).toBe('Crypto Unavailable');
	});
	test('select-chain returns the normal title when chains are selectable', () => {
		expect(
			getCheckoutStepTitle('select-chain', { hasSelectableChains: true }),
		).toBe('Select Network');
	});
	test('non-chain steps ignore the selectable-chains flag', () => {
		const off = { hasSelectableChains: false };
		expect(getCheckoutStepTitle('select-token', off)).toBe('Select Token');
		expect(getCheckoutStepTitle('connect-wallet', off)).toBe('Connect Wallet');
		expect(getCheckoutStepTitle('review', off)).toBe('Review & Pay');
		expect(getCheckoutStepTitle('confirming', off)).toBe('Confirming');
		expect(getCheckoutStepTitle('success', off)).toBe('Payment Complete');
		expect(getCheckoutStepTitle('failure', off)).toBe('Payment Failed');
	});
});

describe('wasTokenStepShown', () => {
	test('returns false before a chain is selected', () => {
		expect(wasTokenStepShown(null, 5)).toBe(false);
	});
	test('returns false when the selected chain has exactly one token', () => {
		// Single-token chains auto-skip the token step — FE renders 3 dots.
		expect(wasTokenStepShown(1, 1)).toBe(false);
	});
	test('returns true when the selected chain exposes multiple tokens', () => {
		expect(wasTokenStepShown(1, 2)).toBe(true);
	});
});

describe('getStepNumber', () => {
	describe('unavailable-chain variant', () => {
		test('returns 0 on select-chain when no chain is selectable', () => {
			expect(
				getStepNumber('select-chain', {
					tokenStepShown: false,
					hasSelectableChains: false,
				}),
			).toBe(0);
		});
	});

	describe('multi-token flow', () => {
		test('assigns review step number 4 when the token step was shown', () => {
			expect(
				getStepNumber('review', {
					tokenStepShown: true,
					hasSelectableChains: true,
				}),
			).toBe(4);
		});
		test('assigns connect-wallet number 3 when the token step was shown', () => {
			expect(
				getStepNumber('connect-wallet', {
					tokenStepShown: true,
					hasSelectableChains: true,
				}),
			).toBe(3);
		});
	});

	describe('single-token flow', () => {
		test('assigns review step number 3 when the token step was skipped', () => {
			expect(
				getStepNumber('review', {
					tokenStepShown: false,
					hasSelectableChains: true,
				}),
			).toBe(3);
		});
		test('assigns connect-wallet number 2 when the token step was skipped', () => {
			expect(
				getStepNumber('connect-wallet', {
					tokenStepShown: false,
					hasSelectableChains: true,
				}),
			).toBe(2);
		});
	});

	describe('terminal steps', () => {
		test('hides progress for confirming / success / failure', () => {
			const t = { tokenStepShown: true, hasSelectableChains: true };
			expect(getStepNumber('confirming', t)).toBe(0);
			expect(getStepNumber('success', t)).toBe(0);
			expect(getStepNumber('failure', t)).toBe(0);
		});
	});
});

describe('getTotalSteps', () => {
	test('returns 4 when the token step is shown', () => {
		expect(getTotalSteps({ tokenStepShown: true })).toBe(4);
	});
	test('returns 3 when the token step is auto-skipped', () => {
		expect(getTotalSteps({ tokenStepShown: false })).toBe(3);
	});
});
