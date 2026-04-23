import { z } from 'zod';

/** Email + password schema for traditional sign-in */
export const passwordSignInFormSchema = z.object({
	email: z.email('Invalid email address'),
	password: z
		.string()
		.min(12, 'Password must be at least 12 characters')
		.max(128),
});

/** Email-only schema for magic link sign-in */
export const magicLinkEmailFormSchema = z.object({
	email: z.email('Invalid email address'),
});

export type PasswordSignInFormValues = z.infer<typeof passwordSignInFormSchema>;
export type MagicLinkEmailFormValues = z.infer<typeof magicLinkEmailFormSchema>;
