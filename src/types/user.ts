import { z } from 'zod';

/**
 * Schema for GET /me response — full user profile.
 *
 * Validation boundary: server-side — parsed in the `getMe` server action
 * to catch backend contract drift before data reaches components.
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
	/**
	 * `true` once the user has a non-null password on their credential
	 * account. Drives the Security UI branch — users without a password
	 * (social login / magic-link signups) see a "Set a password" form
	 * (POST /auth/set-password); users with one see "Change password"
	 * (POST /auth/change-password, which requires `currentPassword`).
	 * Mirrors `MeResponseDto.hasPassword` on the BE.
	 */
	hasPassword: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/**
 * Schema for POST /me/avatar response.
 * Backend returns { image: 'users/...' } — relative path, not a full URL.
 *
 * Validation boundary: server-side — parsed in the upload avatar server action.
 */
export const uploadAvatarResponseSchema = z.object({
	image: z.string(),
});

/**
 * Schema for PATCH /me request payload.
 *
 * Validation boundary: client-side — validated in the profile edit form
 * before calling the server action. Backend also enforces these limits.
 */
export const updateMePayloadSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	bio: z.string().max(500).optional(),
});

/**
 * Schema for PUT /me response.
 * Backend returns a simplified structure compared to GET /me.
 *
 * Validation boundary: server-side — parsed from backend response.
 */
export const updateMeResponseSchema = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string(),
	username: z.string().nullable(),
	image: z.string().nullable(),
	bio: z.string().nullable(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
export type UploadAvatarResponse = z.infer<typeof uploadAvatarResponseSchema>;
export type UpdateMePayload = z.infer<typeof updateMePayloadSchema>;
export type UpdateMeResponse = z.infer<typeof updateMeResponseSchema>;
