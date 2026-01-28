import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for a single update
 * Represents an announcement posted by a host for their raffle
 */
export const updateSchema = z.object({
	id: z.string(),
	raffleId: z.string(),
	text: z.string().min(1).max(5_000),
	imageUrls: z.array(z.string()),
	createdAt: z.string(),
});

/**
 * Schema for list updates response
 * Returns an array of updates for a raffle
 */
export const listUpdatesResponseSchema = z.object({
	updates: z.array(updateSchema),
});

/**
 * Schema for creating an update
 * Payload sent to POST /raffles/:raffleId/updates
 */
export const createUpdatePayloadSchema = z.object({
	text: z.string().min(1).max(5_000),
	imageUrls: z.array(z.string()).max(5).optional(),
});

/**
 * Schema for upload update images response
 * Returned by POST /raffles/:raffleId/updates/images
 */
export const uploadUpdateImagesResponseSchema = z.object({
	imageUrls: z.array(z.string()),
});

// ==========================================
// Inferred Types
// ==========================================

export type Update = z.infer<typeof updateSchema>;
export type ListUpdatesResponse = z.infer<typeof listUpdatesResponseSchema>;
export type CreateUpdatePayload = z.infer<typeof createUpdatePayloadSchema>;
export type UploadUpdateImagesResponse = z.infer<
	typeof uploadUpdateImagesResponseSchema
>;
