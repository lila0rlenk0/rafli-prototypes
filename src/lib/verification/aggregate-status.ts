import {
	VERIFICATION_STATUS,
	type VerificationStatus,
	type VerificationStatusResponse,
} from '@/types/verification-status';

const STATUS_PRIORITY: readonly VerificationStatus[] = [
	VERIFICATION_STATUS.APPROVED,
	VERIFICATION_STATUS.IN_REVIEW,
	VERIFICATION_STATUS.REJECTED,
	VERIFICATION_STATUS.DRAFT,
] as const;

/**
 * Single aggregate badge for profile: highest-priority status across KYB x2 + KYC.
 */
export function deriveAggregateStatus(response: VerificationStatusResponse): {
	status: VerificationStatus;
	rejectionReason: string | null;
} {
	const allTypes = [
		response.kybIndividual,
		response.kybCompany,
		response.kycWinner,
	];
	for (const priority of STATUS_PRIORITY) {
		const match = allTypes.find(s => s.status === priority);
		if (!match) continue;
		const rejectionReason =
			priority === VERIFICATION_STATUS.REJECTED ? match.rejectionReason : null;
		return { status: priority, rejectionReason };
	}
	return { status: VERIFICATION_STATUS.NONE, rejectionReason: null };
}
