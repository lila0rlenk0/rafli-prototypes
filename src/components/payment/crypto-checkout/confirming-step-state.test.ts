import { describe, expect, test } from 'bun:test';

import { buildConfirmingPhases } from './confirming-step-state';

describe('buildConfirmingPhases', () => {
	test('keeps exactly one active phase before broadcast', () => {
		const phases = buildConfirmingPhases({
			txHash: undefined,
			confirmations: 0,
			confirmationTarget: 12,
			finalizationRequested: false,
		});

		expect(phases.map(phase => phase.status)).toEqual([
			'active',
			'pending',
			'pending',
			'pending',
		]);
	});

	test('shows broadcast done but hides confirmation detail at zero confirmations', () => {
		const phases = buildConfirmingPhases({
			txHash: '0xabc',
			confirmations: 0,
			confirmationTarget: 12,
			finalizationRequested: false,
		});

		expect(phases.map(phase => phase.status)).toEqual([
			'done',
			'active',
			'pending',
			'pending',
		]);
		// Zero confirmations should not show "0 / 12 blocks" — no detail yet
		expect(phases[1]?.detail).toBeNull();
	});

	test('keeps exactly one active phase while waiting for confirmations', () => {
		const phases = buildConfirmingPhases({
			txHash: '0xabc',
			confirmations: 3,
			confirmationTarget: 12,
			finalizationRequested: false,
		});

		expect(phases.map(phase => phase.status)).toEqual([
			'done',
			'active',
			'pending',
			'pending',
		]);
		expect(phases[1]?.detail).toBe('3 / 12 blocks');
	});

	test('moves to verifying once target is reached but backend confirm not yet accepted', () => {
		const phases = buildConfirmingPhases({
			txHash: '0xabc',
			confirmations: 128,
			confirmationTarget: 128,
			finalizationRequested: false,
		});

		expect(phases.map(phase => phase.status)).toEqual([
			'done',
			'done',
			'active',
			'pending',
		]);
	});

	test('moves to completing once backend accepted the finalization request', () => {
		const phases = buildConfirmingPhases({
			txHash: '0xabc',
			confirmations: 140,
			confirmationTarget: 128,
			finalizationRequested: true,
		});

		expect(phases.map(phase => phase.status)).toEqual([
			'done',
			'done',
			'done',
			'active',
		]);
		expect(phases[1]?.detail).toBe('128 / 128 blocks');
	});
});
