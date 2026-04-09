import { z } from 'zod';

/**
 * User's email notification preferences — one boolean per notification category.
 *
 * Validation boundary: both — server-side for GET response parsing,
 * client-side for the toggle form before PATCH.
 */
export const emailPreferencesSchema = z.object({
	hostNotifications: z.boolean(),
	prizeUpdates: z.boolean(),
	raffleLifecycle: z.boolean(),
	reviewNotifications: z.boolean(),
});

/** Partial update — only send fields to change */
export const updateEmailPreferencesSchema = emailPreferencesSchema.partial();

/** Full email preferences shape from GET /me/email-preferences. */
export type EmailPreferences = z.infer<typeof emailPreferencesSchema>;

/** Partial email preferences for PATCH /me/email-preferences. */
export type UpdateEmailPreferences = z.infer<
	typeof updateEmailPreferencesSchema
>;
