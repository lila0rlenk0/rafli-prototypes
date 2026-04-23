import { z } from 'zod';

/** Supported OAuth providers — extend this object when adding new social logins */
export const SOCIAL_PROVIDERS = {
	GOOGLE: 'google',
} as const;

/**
 * User data stored in the session cookie after authentication.
 *
 * Validation boundary: server-side — parsed from the `raffly-session` cookie
 * in `getSession()`. Client reads this cookie directly (httpOnly: false)
 * but the Zod parse happens in the server action layer.
 */
export const authUserSchema = z.object({
	id: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
	name: z.string(),
	image: z.string().nullable().optional(),
	/** Backend permission strings — see `permissionSchema` in user-mode.ts for valid values */
	permissions: z.array(z.string()).optional(),
});

/**
 * Full auth session returned after sign-in/sign-up.
 *
 * Validation boundary: server-side — parsed from backend auth response
 * before setting cookies.
 */
export const authSessionSchema = z.object({
	user: authUserSchema,
	token: z.string(),
	expiresAt: z.string(),
});

/**
 * Sign-in form input.
 *
 * Validation boundary: client-side — validated in the sign-in form
 * before calling the server action. min(1) on password prevents empty submits.
 */
export const signInInputSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

/**
 * Sign-up form input.
 *
 * Validation boundary: client-side — validated in the sign-up form.
 * min(12) on password enforces the platform's password policy before
 * the request reaches the backend's own validation.
 */
export const signUpInputSchema = z.object({
	email: z.email(),
	/** 12-char minimum — platform password policy, also enforced by backend */
	password: z.string().min(12),
	name: z.string().min(1),
});

export const socialProviderSchema = z.enum([SOCIAL_PROVIDERS.GOOGLE]);

/**
 * Social sign-in input.
 *
 * Validation boundary: client-side — validated before redirecting to OAuth provider.
 */
export const socialSignInInputSchema = z.object({
	provider: socialProviderSchema,
	callbackURL: z.url().optional(),
});

/**
 * Social sign-in response — contains the OAuth redirect URL.
 *
 * Validation boundary: server-side — parsed from backend response.
 */
export const socialSignInResponseSchema = z.object({
	redirect: z.boolean(),
	url: z.url(),
});

/**
 * Password reset request input.
 *
 * Validation boundary: client-side — validated in the forgot-password form.
 */
export const requestPasswordResetInputSchema = z.object({
	email: z.email(),
	redirectTo: z.string().optional(),
});

/**
 * Password reset completion input.
 *
 * Validation boundary: client-side — validated in the reset-password form.
 * Token comes from the email link, newPassword enforces min(12) policy.
 */
export const resetPasswordInputSchema = z.object({
	// min(1) rejects empty tokens at the BFF — otherwise the backend burns a
	// round-trip to return the same invalid-token response we can render
	// locally. Also removes a `''` vs `malformed` timing side-channel.
	token: z.string().min(1),
	/** 12-char minimum — same policy as sign-up */
	newPassword: z.string().min(12),
});

/**
 * Change password input (authenticated users).
 *
 * Validation boundary: client-side — validated in the change-password form.
 */
export const changePasswordInputSchema = z.object({
	currentPassword: z.string().min(1),
	/** 12-char minimum — same policy as sign-up */
	newPassword: z.string().min(12),
});

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
