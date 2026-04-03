import { describe, expect, test } from 'bun:test';

import {
	VERIFICATION_TYPE,
	type KycSubmissionSummary,
} from '@/types/kyc-submission';
import {
	VERIFICATION_STATUS,
	type VerificationStatusResponse,
} from '@/types/verification-status';

import { getCurrentRejectedSubmissionNotice } from './page-helpers';

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
