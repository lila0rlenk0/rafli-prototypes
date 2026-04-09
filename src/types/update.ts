import { z } from 'zod';

/** Embedded host data in update responses */
export const updateHostSchema = z.object({
	id: z.string(),
	name: z.string(),
	avatar: z.string().nullable(),
});

/**
 * Announcement posted by a host for their raffle.
 *
 * Validation boundary: server-side — parsed in update-fetching server actions.
 */
export const updateSchema = z.object({
	id: z.string(),
	raffleId: z.string(),
	text: z.string().min(1).max(5_000),
	imageUrls: z.array(z.string()),
	host: updateHostSchema,
	createdAt: z.string(),
});

export const listUpdatesResponseSchema = z.object({
	items: z.array(updateSchema),
	limit: z.number(),
	offset: z.number(),
	total: z.number(),
});

/**
 * Payload for POST /raffles/:raffleId/updates.
 * Images are uploaded separately after update creation.
 */
export const createUpdatePayloadSchema = z.object({
	text: z.string().min(1).max(5_000),
});

/** Backend returns relative paths, not full URLs */
export const uploadUpdateImagesResponseSchema = z.object({
	imageUrls: z.array(z.string()),
});

export type UpdateHost = z.infer<typeof updateHostSchema>;
export type Update = z.infer<typeof updateSchema>;
export type ListUpdatesResponse = z.infer<typeof listUpdatesResponseSchema>;
export type CreateUpdatePayload = z.infer<typeof createUpdatePayloadSchema>;
export type UploadUpdateImagesResponse = z.infer<
	typeof uploadUpdateImagesResponseSchema
>;
