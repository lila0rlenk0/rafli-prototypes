import { z } from 'zod';

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

export type ReportContentType =
	(typeof REPORT_CONTENT_TYPE)[keyof typeof REPORT_CONTENT_TYPE];

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

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

/** Content types that require a raffleId for context — comments, reviews, and chat live under a raffle.
 * Set for O(1) lookup and broader `.has()` type signature (avoids TS2345 with union narrowing). */
const RAFFLE_SCOPED_TYPES: ReadonlySet<ReportContentType> = new Set([
	REPORT_CONTENT_TYPE.COMMENT,
	REPORT_CONTENT_TYPE.REVIEW,
	REPORT_CONTENT_TYPE.CHAT_MESSAGE,
]);

/**
 * Schema for creating a new content report.
 * raffleId is required when contentType is 'comment', 'review', or 'chat_message'
 * since those content items live under a specific raffle.
 *
 * Validation boundary: client-side — validated in the report modal before server action.
 * The `superRefine` enforces the conditional raffleId requirement that a plain `.required()`
 * cannot express.
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
		if (RAFFLE_SCOPED_TYPES.has(data.contentType) && !data.raffleId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'raffleId is required for this content type',
				path: ['raffleId'],
			});
		}
	});

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

export type CreateReportPayload = z.infer<typeof createReportSchema>;
export type UserReportResponse = z.infer<typeof userReportResponseSchema>;
