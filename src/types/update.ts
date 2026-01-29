import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for signed media URL with expiration
 * Represents a presigned URL that expires at a specific time
 */
export const updateMediaUrlSchema = z.object({
	url: z.string(),
	expiresAt: z.string(),
});

/**
 * Schema for host information in updates
 * Embedded host data in update responses
 */
export const updateHostSchema = z.object({
	id: z.string(),
	name: z.string(),
	avatar: z.string().nullable(),
});

/**
 * Schema for a single update
 * Represents an announcement posted by a host for their raffle
 */
export const updateSchema = z.object({
	id: z.string(),
	raffleId: z.string(),
	text: z.string().min(1).max(5_000),
	imageUrls: z.array(updateMediaUrlSchema),
	host: updateHostSchema,
	createdAt: z.string(),
});

/**
 * Schema for list updates response
 * Returns a paginated array of updates for a raffle
 */
export const listUpdatesResponseSchema = z.object({
	items: z.array(updateSchema),
	limit: z.number(),
	offset: z.number(),
	total: z.number(),
});

/**
 * Schema for creating an update
 * Payload sent to POST /raffles/:raffleId/updates
 * Note: Images are uploaded separately after update creation
 */
export const createUpdatePayloadSchema = z.object({
	text: z.string().min(1).max(5_000),
});

/**
 * Schema for upload update images response
 * Returned by POST /updates/:updateId/images
 * Note: Backend returns relative paths, not full URLs
 */
export const uploadUpdateImagesResponseSchema = z.object({
	imageUrls: z.array(z.string()),
});

// ==========================================
// Inferred Types
// ==========================================

export type UpdateMediaUrl = z.infer<typeof updateMediaUrlSchema>;
export type UpdateHost = z.infer<typeof updateHostSchema>;
export type Update = z.infer<typeof updateSchema>;
export type ListUpdatesResponse = z.infer<typeof listUpdatesResponseSchema>;
export type CreateUpdatePayload = z.infer<typeof createUpdatePayloadSchema>;
export type UploadUpdateImagesResponse = z.infer<
	typeof uploadUpdateImagesResponseSchema
>;
