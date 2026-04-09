import { z } from 'zod';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Per-type verification status derived from DB state.
 * Different from KYC_SUBMISSION_STATUS — this represents a computed
 * user-facing state, not the raw DB enum.
 * - 'none': no submission exists for this type
 * - 'draft': submission created but not finalized (still uploading docs)
 * - 'in_review': finalized, awaiting admin review
 * - 'approved': admin approved
 * - 'rejected': admin rejected
 */
export const VERIFICATION_STATUS = {
	NONE: 'none',
	DRAFT: 'draft',
	IN_REVIEW: 'in_review',
	APPROVED: 'approved',
	REJECTED: 'rejected',
} as const;

// ─── Types from Constants ────────────────────────────────────────────────────

export type VerificationStatus =
	(typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const verificationStatusSchema = z.enum([
	VERIFICATION_STATUS.NONE,
	VERIFICATION_STATUS.DRAFT,
	VERIFICATION_STATUS.IN_REVIEW,
	VERIFICATION_STATUS.APPROVED,
	VERIFICATION_STATUS.REJECTED,
]);

/**
 * Per-type verification status — one entry per verification type.
 * Backend derives this from DB status + finalizedAt to split 'pending'
 * into 'draft' (not finalized) vs 'in_review' (finalized, awaiting admin).
 */
export const verificationTypeStatusSchema = z.object({
	status: verificationStatusSchema,
	rejectionReason: z.string().nullable(),
	/** Submission ID — null when status is 'none' */
	submissionId: z.string().nullable(),
});

/**
 * Response schema for GET /me/verification/status
 * Returns per-type breakdown — one status object per verification type.
 * Backend always returns all three keys, even when the user has no submissions
 * (status defaults to 'none' with null submissionId).
 */
export const verificationStatusResponseSchema = z.object({
	kybIndividual: verificationTypeStatusSchema,
	kybCompany: verificationTypeStatusSchema,
	kycWinner: verificationTypeStatusSchema,
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type VerificationTypeStatus = z.infer<
	typeof verificationTypeStatusSchema
>;

export type VerificationStatusResponse = z.infer<
	typeof verificationStatusResponseSchema
>;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Priority order for aggregate status badge — highest priority first.
 * "approved" trumps everything because it means the user is verified.
 * "in_review" next because it signals active progress.
 * "rejected" before "draft" because it requires user action.
 */
const STATUS_PRIORITY: readonly VerificationStatus[] = [
	VERIFICATION_STATUS.APPROVED,
	VERIFICATION_STATUS.IN_REVIEW,
	VERIFICATION_STATUS.REJECTED,
	VERIFICATION_STATUS.DRAFT,
] as const;

/**
 * Derives the most prominent status across all three verification types.
 * Used by the profile badge to show a single aggregate indicator.
 *
 * @returns The highest-priority status and its rejection reason (if rejected)
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

	// Step 1: Walk priority list — first matching status wins.
	for (const priority of STATUS_PRIORITY) {
		const match = allTypes.find(s => s.status === priority);
		if (!match) continue;

		// Only rejected carries a reason — all others are null
		const rejectionReason =
			priority === VERIFICATION_STATUS.REJECTED ? match.rejectionReason : null;
		return { status: priority, rejectionReason };
	}

	// Step 2: No submission exists for any type.
	return { status: VERIFICATION_STATUS.NONE, rejectionReason: null };
}
