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
 * Cloudflare Turnstile token shape — single-use, ~5 min lifespan, issued by the
 * widget callback. Routed to the backend as the `x-captcha-response` header so
 * the Better Auth captcha plugin can verify it before any auth handler runs.
 *
 * Validation boundary: client-side — `min(1)` rejects empty tokens at the BFF
 * before a network call burns the captcha plugin's "MISSING_RESPONSE" response.
 */
const captchaTokenSchema = z.string().min(1);

/**
 * Sign-in form input.
 *
 * Validation boundary: client-side — validated in the sign-in form
 * before calling the server action. min(1) on password prevents empty submits.
 */
export const signInInputSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
	captchaToken: captchaTokenSchema,
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
	captchaToken: captchaTokenSchema,
});

/**
 * Magic-link sign-in input.
 *
 * Validation boundary: client-side — validated in the magic-link email step
 * before calling the browser-side service. Backend's captcha plugin guards
 * `/sign-in/magic-link` because it auto-creates accounts on unknown emails,
 * making it a signup vector regardless of its path name.
 */
export const magicLinkInputSchema = z.object({
	email: z.email(),
	callbackURL: z.url(),
	captchaToken: captchaTokenSchema,
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
	captchaToken: captchaTokenSchema,
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

/**
 * Set password input (authenticated users without a credential account).
 *
 * Used by users created through social login or magic-link who never set a
 * password — adds password auth on top of their existing OAuth/magic-link
 * sign-in. Distinct endpoint from `change-password` because there's no
 * current password to verify; the BE rejects the call with
 * `auth:password:already-set` if the credential row already has a non-null
 * password (use change-password instead in that case).
 *
 * Validation boundary: client-side — validated in the set-password form.
 */
export const setPasswordInputSchema = z.object({
	/** 12-char minimum — same policy as sign-up. */
	newPassword: z.string().min(12),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type SignInInput = z.infer<typeof signInInputSchema>;
export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkInputSchema>;
export type SocialProvider = z.infer<typeof socialProviderSchema>;
export type SocialSignInInput = z.infer<typeof socialSignInInputSchema>;
export type SocialSignInResponse = z.infer<typeof socialSignInResponseSchema>;
export type RequestPasswordResetInput = z.infer<
	typeof requestPasswordResetInputSchema
>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordInputSchema>;
