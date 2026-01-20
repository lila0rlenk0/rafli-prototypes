import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for image object returned by backend
 * Represents a presigned URL that expires at a specific time
 */
const imageSchema = z.object({
	url: z.string(),
	expiresAt: z.string(),
});

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
	image: imageSchema.nullable(),
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

// ==========================================
// Inferred Types
// ==========================================

export type MeResponse = z.infer<typeof meResponseSchema>;
export type ImageObject = z.infer<typeof imageSchema>;
export type UploadAvatarResponse = z.infer<typeof uploadAvatarResponseSchema>;
