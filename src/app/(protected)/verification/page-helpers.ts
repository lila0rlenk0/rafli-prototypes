import type {
	KycSubmissionSummary,
	VerificationType,
} from '@/types/kyc-submission';
import {
	VERIFICATION_STATUS,
	type VerificationStatusResponse,
	type VerificationTypeStatus,
} from '@/types/verification-status';

interface RejectedEntryCandidate {
	rejectionReason: string | null;
	status: VerificationTypeStatus;
	type: VerificationType;
}

export interface RejectedSubmissionNoticeData {
	rejectionReason: string | null;
	submission: KycSubmissionSummary;
}

/**
 * Gets the currently rejected type from the per-type status response.
 * Uses status endpoint as source of truth to avoid showing stale historical rejections.
 *
 * @returns The currently rejected type/status tuple, or null when none are rejected
 */
function getCurrentRejectedStatus(
	statusData: VerificationStatusResponse,
): RejectedEntryCandidate | null {
	const entries: RejectedEntryCandidate[] = [
		{
			type: 'kyb_individual',
			status: statusData.kybIndividual,
			rejectionReason: statusData.kybIndividual.rejectionReason,
		},
		{
			type: 'kyb_company',
			status: statusData.kybCompany,
			rejectionReason: statusData.kybCompany.rejectionReason,
		},
		{
			type: 'kyc_winner',
			status: statusData.kycWinner,
			rejectionReason: statusData.kycWinner.rejectionReason,
		},
	];

	return (
		entries.find(
			entry => entry.status.status === VERIFICATION_STATUS.REJECTED,
		) ?? null
	);
}

/**
 * Computes the rejection notice payload for the verification page.
 * Chooses the current rejected submission only; never surfaces historical rejections.
 *
 * @returns Notice data when a currently rejected submission exists, otherwise null
 */
export function getCurrentRejectedSubmissionNotice(
	submissions: KycSubmissionSummary[],
	statusData: VerificationStatusResponse | null,
): RejectedSubmissionNoticeData | null {
	if (!statusData) return null;

	const rejected = getCurrentRejectedStatus(statusData);
	if (!rejected) return null;

	const bySubmissionId = rejected.status.submissionId
		? submissions.find(
				submission => submission.id === rejected.status.submissionId,
			)
		: null;
	if (bySubmissionId) {
		return {
			submission: bySubmissionId,
			rejectionReason: rejected.rejectionReason,
		};
	}

	const byType = submissions.find(
		submission =>
			submission.type === rejected.type && submission.status === 'rejected',
	);
	if (!byType) return null;

	return {
		submission: byType,
		rejectionReason: rejected.rejectionReason,
	};
}
