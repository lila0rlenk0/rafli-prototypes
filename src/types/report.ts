import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

/** Content types that can be reported by users */
export const REPORT_CONTENT_TYPE = {
	RAFFLE: 'raffle',
	COMMENT: 'comment',
	REVIEW: 'review',
	CHAT_MESSAGE: 'chat_message',
} as const;

/** Report lifecycle statuses (read-only for users, managed by admins) */
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

/** Schema for content types that can be reported */
export const reportContentTypeSchema = z.enum([
	REPORT_CONTENT_TYPE.RAFFLE,
	REPORT_CONTENT_TYPE.COMMENT,
	REPORT_CONTENT_TYPE.REVIEW,
	REPORT_CONTENT_TYPE.CHAT_MESSAGE,
]);

/** Schema for report statuses */
export const reportStatusSchema = z.enum([
	REPORT_STATUS.PENDING,
	REPORT_STATUS.REVIEWING,
	REPORT_STATUS.RESOLVED,
	REPORT_STATUS.DISMISSED,
]);

/**
 * Schema for creating a new report
 * Reason must be 10-500 chars to prevent spam while allowing meaningful descriptions
 */
export const createReportSchema = z.object({
	contentId: z.string(),
	contentType: reportContentTypeSchema,
	raffleId: z.string().optional(),
	reason: z.string().min(10).max(500),
});

/**
 * Schema for the user-facing report response from backend
 * Mirrors backend UserReportResponseDto
 */
export const userReportResponseSchema = z.object({
	id: z.string(),
	contentId: z.string(),
	contentType: reportContentTypeSchema,
	status: reportStatusSchema,
	createdAt: z.string(),
});

// ==========================================
// Inferred Types
// ==========================================

export type CreateReportPayload = z.infer<typeof createReportSchema>;
export type UserReportResponse = z.infer<typeof userReportResponseSchema>;
