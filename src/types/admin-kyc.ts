import { z } from 'zod';

import {
	kycSubmissionStatusSchema,
	verificationTypeSchema,
} from './kyc-submission';

// ─── Schemas ────────────────────────────────────────────────────────────────

/** Schema for a single submission in the admin list view */
export const adminKycSubmissionSchema = z.object({
	id: z.string(),
	/** User email — null if the auth service lookup failed */
	email: z.string().nullable(),
	/** User display name — null if the auth service lookup failed */
	name: z.string().nullable(),
	type: verificationTypeSchema,
	status: kycSubmissionStatusSchema,
	/** When the user finalized their submission — null if still in draft */
	finalizedAt: z.string().nullable(),
	submittedAt: z.string(),
});

/** Schema for the paginated admin submissions list response */
export const adminKycListResponseSchema = z.object({
	submissions: z.array(adminKycSubmissionSchema),
	total: z.number(),
});

/** Schema for admin verification list query parameters */
export const adminKycQuerySchema = z.object({
	page: z.coerce.number().positive().optional(),
	limit: z.coerce.number().positive().max(100).optional(),
	status: kycSubmissionStatusSchema.optional(),
	type: verificationTypeSchema.optional(),
});

/** Schema for a KYC document with a signed download URL */
export const adminKycDocumentSchema = z.object({
	id: z.string(),
	/** Document purpose: id_front, id_back, proof_of_address, etc. */
	purpose: z.string(),
	contentType: z.string(),
	originalFilename: z.string(),
	/** Signed URL with ~5min TTL — null if URL generation failed */
	url: z.string().nullable(),
});

/** Schema for the full admin submission detail response */
export const adminKycDetailSchema = z.object({
	id: z.string(),
	userId: z.string(),
	/** User display name — null if the auth service lookup failed */
	userName: z.string().nullable(),
	/** User email — null if the auth service lookup failed */
	userEmail: z.string().nullable(),
	type: verificationTypeSchema,
	status: kycSubmissionStatusSchema,
	/** All KYC/KYB form fields as a generic record — structure varies by type */
	data: z.record(z.string(), z.unknown()),
	documents: z.array(adminKycDocumentSchema),
	finalizedAt: z.string().nullable(),
	reviewedAt: z.string().nullable(),
	reviewedBy: z.string().nullable(),
	rejectionReason: z.string().nullable(),
	submittedAt: z.string(),
});

/** Schema for the admin review action input */
export const adminKycReviewInputSchema = z
	.object({
		decision: z.enum(['approved', 'rejected']),
		/** Required when decision is 'rejected' — explains why to the user */
		rejectionReason: z.string().optional(),
	})
	.refine(
		// Rejection reason is mandatory for rejections — the user needs to
		// know what to fix before resubmitting their verification
		data =>
			data.decision !== 'rejected' ||
			(data.rejectionReason && data.rejectionReason.trim().length > 0),
		{
			message: 'Rejection reason is required when rejecting a submission',
			path: ['rejectionReason'],
		},
	);

/** Schema for the review action response */
export const adminKycReviewResponseSchema = z.object({
	id: z.string(),
	status: kycSubmissionStatusSchema,
	reviewedAt: z.string(),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type AdminKycSubmission = z.infer<typeof adminKycSubmissionSchema>;
export type AdminKycListResponse = z.infer<typeof adminKycListResponseSchema>;
export type AdminKycQuery = z.infer<typeof adminKycQuerySchema>;
export type AdminKycDocument = z.infer<typeof adminKycDocumentSchema>;
export type AdminKycDetail = z.infer<typeof adminKycDetailSchema>;
export type AdminKycReviewInput = z.infer<typeof adminKycReviewInputSchema>;
export type AdminKycReviewResponse = z.infer<
	typeof adminKycReviewResponseSchema
>;
