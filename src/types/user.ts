import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for /me endpoint response
 * Returned by GET /me
 */
export const meResponseSchema = z.object({
	id: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
	name: z.string(),
	username: z.string().nullable(),
	image: z.string().nullable(),
	bio: z.string().nullable(),
	permissions: z.array(z.string()).optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/**
 * Schema for avatar upload response
 * Returned by POST /me/avatar
 * Backend returns { image: 'users/...' } - relative path
 */
export const uploadAvatarResponseSchema = z.object({
	image: z.string(),
});

/**
 * Schema for updating user profile
 * Used by PUT /me endpoint
 */
export const updateMePayloadSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	bio: z.string().max(500).optional(),
});

/**
 * Schema for PUT /me response
 * Backend returns a simplified structure compared to GET /me
 */
export const updateMeResponseSchema = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string(),
	username: z.string().nullable(),
	image: z.string().nullable(),
	bio: z.string().nullable(),
});

// ==========================================
// Inferred Types
// ==========================================

export type MeResponse = z.infer<typeof meResponseSchema>;
export type UploadAvatarResponse = z.infer<typeof uploadAvatarResponseSchema>;
export type UpdateMePayload = z.infer<typeof updateMePayloadSchema>;
export type UpdateMeResponse = z.infer<typeof updateMeResponseSchema>;
