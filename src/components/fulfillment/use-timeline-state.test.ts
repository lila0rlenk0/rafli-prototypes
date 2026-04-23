import { describe, expect, test } from 'bun:test';

import { deriveStepStatus, resolveActiveStep } from './use-timeline-state';

describe('resolveActiveStep', () => {
	describe('pre-claim statuses', () => {
		test('pending anchors step 1', () => {
			expect(resolveActiveStep('pending', { isHost: false })).toBe(1);
			expect(resolveActiveStep('pending', { isHost: true })).toBe(1);
		});

		test('legacy pending_partial_fulfillment anchors step 1', () => {
			expect(
				resolveActiveStep('pending_partial_fulfillment', { isHost: false }),
			).toBe(1);
		});

		test('awaiting_host anchors step 2', () => {
			expect(resolveActiveStep('awaiting_host', { isHost: false })).toBe(2);
		});
	});

	describe('sent — role-aware', () => {
		test('host sees step 3 (mark as delivered)', () => {
			expect(resolveActiveStep('sent', { isHost: true })).toBe(3);
		});

		test('winner skips to step 4 (confirm receipt)', () => {
			expect(resolveActiveStep('sent', { isHost: false })).toBe(4);
		});
	});

	describe('terminal-ish statuses', () => {
		test('delivered anchors step 4', () => {
			expect(resolveActiveStep('delivered', { isHost: false })).toBe(4);
			expect(resolveActiveStep('delivered', { isHost: true })).toBe(4);
		});

		test('disputed anchors step 4 — dispute lives inside the delivery step', () => {
			expect(resolveActiveStep('disputed', { isHost: false })).toBe(4);
		});

		test('received marks every step completed', () => {
			expect(resolveActiveStep('received', { isHost: false })).toBe(5);
		});

		test('resolved marks every step completed', () => {
			expect(resolveActiveStep('resolved', { isHost: true })).toBe(5);
		});
	});

	test('undefined status falls back to the "nothing yet" anchor', () => {
		expect(resolveActiveStep(undefined, { isHost: false })).toBe(0);
	});
});

describe('deriveStepStatus', () => {
	test('activeStep 0 → every step pending', () => {
		expect(deriveStepStatus(1, 0)).toBe('pending');
		expect(deriveStepStatus(4, 0)).toBe('pending');
	});

	test('activeStep >= 5 → every step completed', () => {
		expect(deriveStepStatus(1, 5)).toBe('completed');
		expect(deriveStepStatus(4, 5)).toBe('completed');
	});

	test('step before active is completed', () => {
		expect(deriveStepStatus(1, 3)).toBe('completed');
		expect(deriveStepStatus(2, 3)).toBe('completed');
	});

	test('step equal to active is active', () => {
		expect(deriveStepStatus(3, 3)).toBe('active');
	});

	test('step after active is pending', () => {
		expect(deriveStepStatus(4, 2)).toBe('pending');
	});
});
