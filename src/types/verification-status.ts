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
 * Derives the most prominent status across all three verification types.
 * Priority: approved > in_review > rejected > draft > none.
 * Used by the profile badge to show a single aggregate indicator.
 *
 * @returns The highest-priority status and its rejection reason (if rejected)
 */
export function deriveAggregateStatus(response: VerificationStatusResponse): {
	status: VerificationStatus;
	rejectionReason: string | null;
} {
	const statuses = [
		response.kybIndividual,
		response.kybCompany,
		response.kycWinner,
	];

	// Priority order — first match wins
	const approved = statuses.find(
		s => s.status === VERIFICATION_STATUS.APPROVED,
	);
	if (approved)
		return { status: VERIFICATION_STATUS.APPROVED, rejectionReason: null };

	const inReview = statuses.find(
		s => s.status === VERIFICATION_STATUS.IN_REVIEW,
	);
	if (inReview)
		return { status: VERIFICATION_STATUS.IN_REVIEW, rejectionReason: null };

	const rejected = statuses.find(
		s => s.status === VERIFICATION_STATUS.REJECTED,
	);
	if (rejected)
		return {
			status: VERIFICATION_STATUS.REJECTED,
			rejectionReason: rejected.rejectionReason,
		};

	const draft = statuses.find(s => s.status === VERIFICATION_STATUS.DRAFT);
	if (draft)
		return { status: VERIFICATION_STATUS.DRAFT, rejectionReason: null };

	return { status: VERIFICATION_STATUS.NONE, rejectionReason: null };
}
