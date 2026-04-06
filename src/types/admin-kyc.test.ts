import { describe, expect, test } from 'bun:test';

import { adminKycReviewInputSchema } from './admin-kyc';

describe('adminKycReviewInputSchema', () => {
	describe('approve decision', () => {
		test('accepts approval without rejection reason', () => {
			const result = adminKycReviewInputSchema.safeParse({
				decision: 'approved',
			});
			expect(result.success).toBe(true);
		});

		test('accepts approval with rejection reason (ignored but valid)', () => {
			const result = adminKycReviewInputSchema.safeParse({
				decision: 'approved',
				rejectionReason: 'some reason',
			});
			expect(result.success).toBe(true);
		});
	});

	describe('reject decision', () => {
		test('accepts rejection with non-empty reason', () => {
			const result = adminKycReviewInputSchema.safeParse({
				decision: 'rejected',
				rejectionReason: 'Documents are blurry',
			});
			expect(result.success).toBe(true);
		});

		test('rejects rejection without reason', () => {
			const result = adminKycReviewInputSchema.safeParse({
				decision: 'rejected',
			});
			expect(result.success).toBe(false);
		});

		test('rejects rejection with empty string reason', () => {
			const result = adminKycReviewInputSchema.safeParse({
				decision: 'rejected',
				rejectionReason: '',
			});
			expect(result.success).toBe(false);
		});

		test('rejects rejection with whitespace-only reason', () => {
			const result = adminKycReviewInputSchema.safeParse({
				decision: 'rejected',
				rejectionReason: '   \t\n  ',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('invalid decisions', () => {
		test('rejects unknown decision value', () => {
			const result = adminKycReviewInputSchema.safeParse({
				decision: 'pending',
			});
			expect(result.success).toBe(false);
		});

		test('rejects missing decision field', () => {
			const result = adminKycReviewInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		test('rejects null input', () => {
			const result = adminKycReviewInputSchema.safeParse(null);
			expect(result.success).toBe(false);
		});

		test('rejects non-object input', () => {
			const result = adminKycReviewInputSchema.safeParse('approved');
			expect(result.success).toBe(false);
		});
	});
});
