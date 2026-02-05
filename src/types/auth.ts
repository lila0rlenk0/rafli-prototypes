import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

/**
 * Supported social login providers
 */
export const SOCIAL_PROVIDERS = {
	GOOGLE: 'google',
} as const;

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for authenticated user data
 * Stored in session cookies after authentication
 */
export const authUserSchema = z.object({
	id: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
	name: z.string(),
	image: z.string().nullable().optional(),
	permissions: z.array(z.string()).optional(),
});

/**
 * Schema for authentication session
 * Contains user data, JWT token, and expiration
 */
export const authSessionSchema = z.object({
	user: authUserSchema,
	token: z.string(),
	expiresAt: z.string(),
});

/**
 * Schema for sign-in credentials
 */
export const signInInputSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

/**
 * Schema for sign-up registration data
 */
export const signUpInputSchema = z.object({
	email: z.email(),
	password: z.string().min(12),
	name: z.string().min(1),
});

/**
 * Schema for social login provider
 */
export const socialProviderSchema = z.enum([SOCIAL_PROVIDERS.GOOGLE]);

/**
 * Schema for social sign-in initiation request
 */
export const socialSignInInputSchema = z.object({
	provider: socialProviderSchema,
	callbackURL: z.url().optional(),
});

/**
 * Schema for social sign-in initiation response
 */
export const socialSignInResponseSchema = z.object({
	redirect: z.boolean(),
	url: z.url(),
});

/**
 * Schema for requesting password reset email
 */
export const requestPasswordResetInputSchema = z.object({
	email: z.email(),
	redirectTo: z.string().optional(),
});

/**
 * Schema for resetting password with token
 */
export const resetPasswordInputSchema = z.object({
	token: z.string(),
	newPassword: z.string().min(12),
});

/**
 * Schema for changing password (authenticated users)
 */
export const changePasswordInputSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: z.string().min(12),
});

// ==========================================
// Inferred Types
// ==========================================

export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type SignInInput = z.infer<typeof signInInputSchema>;
export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type SocialProvider = z.infer<typeof socialProviderSchema>;
export type SocialSignInInput = z.infer<typeof socialSignInInputSchema>;
export type SocialSignInResponse = z.infer<typeof socialSignInResponseSchema>;
export type RequestPasswordResetInput = z.infer<
	typeof requestPasswordResetInputSchema
>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
