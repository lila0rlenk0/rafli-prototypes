import { describe, expect, test } from 'bun:test';

import { getKycNudgeCopy, resolveKycNudgeStatus } from './kyc-nudge';

// Shared fixtures — mutating at call site makes tests self-documenting.
const WINNER_PENDING = {
	isHost: false,
	kycStatus: 'none' as const,
	winningStatus: 'pending' as const,
};

describe('resolveKycNudgeStatus', () => {
	describe('visibility gates', () => {
		test('hides nudge for host view', () => {
			expect(
				resolveKycNudgeStatus({ ...WINNER_PENDING, isHost: true }),
			).toBeNull();
		});

		test('hides nudge when kycStatus is null (fetch failed)', () => {
			expect(
				resolveKycNudgeStatus({ ...WINNER_PENDING, kycStatus: null }),
			).toBeNull();
		});

		test('hides nudge when user is already approved', () => {
			expect(
				resolveKycNudgeStatus({ ...WINNER_PENDING, kycStatus: 'approved' }),
			).toBeNull();
		});

		test('hides nudge once winner has claimed (awaiting_host)', () => {
			expect(
				resolveKycNudgeStatus({
					...WINNER_PENDING,
					winningStatus: 'awaiting_host',
				}),
			).toBeNull();
		});

		test('hides nudge for sent/delivered/received/disputed/resolved', () => {
			const postClaimStatuses = [
				'sent',
				'delivered',
				'received',
				'disputed',
				'resolved',
			] as const;

			for (const winningStatus of postClaimStatuses) {
				expect(
					resolveKycNudgeStatus({ ...WINNER_PENDING, winningStatus }),
				).toBeNull();
			}
		});
	});

	describe('actionable states', () => {
		test('shows nudge when kyc is none and claim is pending', () => {
			expect(
				resolveKycNudgeStatus({ ...WINNER_PENDING, kycStatus: 'none' }),
			).toBe('none');
		});

		test('shows nudge when kyc is draft and claim is pending', () => {
			expect(
				resolveKycNudgeStatus({ ...WINNER_PENDING, kycStatus: 'draft' }),
			).toBe('draft');
		});

		test('shows nudge when kyc is in_review and claim is pending', () => {
			expect(
				resolveKycNudgeStatus({ ...WINNER_PENDING, kycStatus: 'in_review' }),
			).toBe('in_review');
		});

		test('shows nudge when kyc is rejected and claim is pending', () => {
			expect(
				resolveKycNudgeStatus({ ...WINNER_PENDING, kycStatus: 'rejected' }),
			).toBe('rejected');
		});
	});

	describe('legacy winning status', () => {
		// Legacy DB records may still carry pending_partial_fulfillment, which is
		// semantically equivalent to pending — the nudge should behave identically.
		test('treats pending_partial_fulfillment as pending', () => {
			expect(
				resolveKycNudgeStatus({
					...WINNER_PENDING,
					winningStatus: 'pending_partial_fulfillment',
				}),
			).toBe('none');
		});
	});
});

describe('getKycNudgeCopy', () => {
	test('returns the expected copy shape for none', () => {
		const copy = getKycNudgeCopy('none');
		expect(copy.title).toContain('Identity verification required');
		expect(copy.body).toContain('verify your identity');
		expect(copy.cta).toBe('Verify identity');
	});

	test('returns resume copy for draft', () => {
		const copy = getKycNudgeCopy('draft');
		expect(copy.title).toContain('Complete your verification');
		expect(copy.cta).toBe('Resume verification');
	});

	test('returns re-submit copy for rejected', () => {
		const copy = getKycNudgeCopy('rejected');
		expect(copy.title).toContain('rejected');
		expect(copy.cta).toBe('Re-submit verification');
	});

	test('all actionable copies have non-empty title, body, and cta', () => {
		const statuses = ['none', 'draft', 'rejected'] as const;
		for (const status of statuses) {
			const copy = getKycNudgeCopy(status);
			expect(copy.title.length).toBeGreaterThan(0);
			expect(copy.body.length).toBeGreaterThan(0);
			expect(copy.cta.length).toBeGreaterThan(0);
		}
	});
});
