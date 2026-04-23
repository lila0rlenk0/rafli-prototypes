import { describe, expect, test } from 'bun:test';

import {
	VERIFICATION_TYPE,
	type KycSubmissionSummary,
} from '@/types/kyc-submission';
import {
	VERIFICATION_STATUS,
	type VerificationStatusResponse,
} from '@/types/verification-status';
import { getCurrentRejectedSubmissionNotice } from '@/lib/verification/rejected-submission-notice';

function buildStatusResponse(
	overrides: Partial<VerificationStatusResponse>,
): VerificationStatusResponse {
	return {
		kybIndividual: {
			status: VERIFICATION_STATUS.NONE,
			rejectionReason: null,
			submissionId: null,
		},
		kybCompany: {
			status: VERIFICATION_STATUS.NONE,
			rejectionReason: null,
			submissionId: null,
		},
		kycWinner: {
			status: VERIFICATION_STATUS.NONE,
			rejectionReason: null,
			submissionId: null,
		},
		...overrides,
	};
}

describe('getCurrentRejectedSubmissionNotice', () => {
	test('returns null when no type is currently rejected', () => {
		const submissions: KycSubmissionSummary[] = [
			{
				id: 'historical-rejected',
				type: VERIFICATION_TYPE.KYB_INDIVIDUAL,
				status: 'rejected',
				submittedAt: '2026-04-01T00:00:00.000Z',
			},
		];
		const statusData = buildStatusResponse({
			kybIndividual: {
				status: VERIFICATION_STATUS.IN_REVIEW,
				rejectionReason: null,
				submissionId: 'new-in-review-id',
			},
		});

		const result = getCurrentRejectedSubmissionNotice(submissions, statusData);
		expect(result).toBeNull();
	});

	test('returns null when statusData is null (pre-fetch / request error)', () => {
		// Status endpoint can be unavailable during initial hydration or 5xx
		// retries — notice should stay hidden rather than using stale data.
		const result = getCurrentRejectedSubmissionNotice([], null);
		expect(result).toBeNull();
	});

	test('falls back to type+status match when submissionId is missing on status response', () => {
		// Legacy status responses (pre-submissionId field) omit the id but
		// still report rejection. Notice must still surface by matching type.
		const submissions: KycSubmissionSummary[] = [
			{
				id: 'historical-rejected',
				type: VERIFICATION_TYPE.KYC_WINNER,
				status: 'rejected',
				submittedAt: '2026-04-01T00:00:00.000Z',
			},
		];
		const statusData = buildStatusResponse({
			kycWinner: {
				status: VERIFICATION_STATUS.REJECTED,
				rejectionReason: 'ID blurry',
				submissionId: null,
			},
		});

		const result = getCurrentRejectedSubmissionNotice(submissions, statusData);
		expect(result?.submission.id).toBe('historical-rejected');
		expect(result?.rejectionReason).toBe('ID blurry');
	});

	test('returns null when status reports rejection but no matching submission exists', () => {
		// Rare: status says rejected but submissions list is empty (e.g. the
		// rejected submission was purged). Notice must hide rather than crash.
		const statusData = buildStatusResponse({
			kybCompany: {
				status: VERIFICATION_STATUS.REJECTED,
				rejectionReason: 'Missing docs',
				submissionId: 'unknown-id',
			},
		});

		const result = getCurrentRejectedSubmissionNotice([], statusData);
		expect(result).toBeNull();
	});

	test('returns current rejected submission matched by submissionId', () => {
		const submissions: KycSubmissionSummary[] = [
			{
				id: 'old-rejected',
				type: VERIFICATION_TYPE.KYB_INDIVIDUAL,
				status: 'rejected',
				submittedAt: '2026-04-01T00:00:00.000Z',
			},
			{
				id: 'current-rejected',
				type: VERIFICATION_TYPE.KYB_COMPANY,
				status: 'rejected',
				submittedAt: '2026-04-02T00:00:00.000Z',
			},
		];
		const statusData = buildStatusResponse({
			kybCompany: {
				status: VERIFICATION_STATUS.REJECTED,
				rejectionReason: 'Document too blurry',
				submissionId: 'current-rejected',
			},
		});

		const result = getCurrentRejectedSubmissionNotice(submissions, statusData);

		expect(result).not.toBeNull();
		expect(result?.submission.id).toBe('current-rejected');
		expect(result?.rejectionReason).toBe('Document too blurry');
	});
});
