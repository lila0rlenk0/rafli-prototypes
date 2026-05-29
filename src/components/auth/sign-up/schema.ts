import { z } from 'zod';

/** Email + password schema for traditional sign-up */
export const passwordSignUpFormSchema = z.object({
	email: z.email('Invalid email address'),
	password: z
		.string()
		.min(12, 'Password must be at least 12 characters')
		.max(128),
});

/** Email-only schema for magic link sign-up */
export const magicLinkEmailFormSchema = z.object({
	email: z.email('Invalid email address'),
});

export type PasswordSignUpFormValues = z.infer<typeof passwordSignUpFormSchema>;
export type MagicLinkEmailFormValues = z.infer<typeof magicLinkEmailFormSchema>;
