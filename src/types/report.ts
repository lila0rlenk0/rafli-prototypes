import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

/** Content types that can be reported for moderation */
export const REPORT_CONTENT_TYPE = {
	RAFFLE: 'raffle',
	COMMENT: 'comment',
	REVIEW: 'review',
	CHAT_MESSAGE: 'chat_message',
} as const;

/** Status progression for a moderation report */
export const REPORT_STATUS = {
	PENDING: 'pending',
	REVIEWING: 'reviewing',
	RESOLVED: 'resolved',
	DISMISSED: 'dismissed',
} as const;

// ==========================================
// Types from Constants
// ==========================================

export type ReportContentType =
	(typeof REPORT_CONTENT_TYPE)[keyof typeof REPORT_CONTENT_TYPE];

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

// ==========================================
// Schemas
// ==========================================

export const reportContentTypeSchema = z.enum([
	REPORT_CONTENT_TYPE.RAFFLE,
	REPORT_CONTENT_TYPE.COMMENT,
	REPORT_CONTENT_TYPE.REVIEW,
	REPORT_CONTENT_TYPE.CHAT_MESSAGE,
]);

export const reportStatusSchema = z.enum([
	REPORT_STATUS.PENDING,
	REPORT_STATUS.REVIEWING,
	REPORT_STATUS.RESOLVED,
	REPORT_STATUS.DISMISSED,
]);

/** Content types that require a raffleId for context */
const RAFFLE_SCOPED_TYPES: readonly ReportContentType[] = [
	REPORT_CONTENT_TYPE.COMMENT,
	REPORT_CONTENT_TYPE.REVIEW,
	REPORT_CONTENT_TYPE.CHAT_MESSAGE,
];

/**
 * Schema for creating a new content report.
 * raffleId is required when contentType is 'comment', 'review', or 'chat_message'
 * since those content items live under a specific raffle.
 */
export const createReportSchema = z
	.object({
		contentId: z.string().min(1),
		contentType: reportContentTypeSchema,
		raffleId: z.string().optional(),
		reason: z.string().min(10).max(500),
	})
	.superRefine((data, ctx) => {
		// Raffle-scoped content types need raffleId to locate the content
		if (RAFFLE_SCOPED_TYPES.includes(data.contentType) && !data.raffleId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'raffleId is required for this content type',
				path: ['raffleId'],
			});
		}
	});

/**
 * Schema for the report response returned by the API after creation
 */
export const userReportResponseSchema = z.object({
	id: z.string(),
	contentId: z.string(),
	contentType: reportContentTypeSchema,
	raffleId: z.string().nullable(),
	reason: z.string(),
	status: reportStatusSchema,
	resolvedAt: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

// ==========================================
// Inferred Types
// ==========================================

export type CreateReportPayload = z.infer<typeof createReportSchema>;
export type UserReportResponse = z.infer<typeof userReportResponseSchema>;
