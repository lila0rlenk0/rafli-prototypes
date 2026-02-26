import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for email notification preferences
 */
export const emailPreferencesSchema = z.object({
	hostNotifications: z.boolean(),
	prizeUpdates: z.boolean(),
	raffleLifecycle: z.boolean(),
	reviewNotifications: z.boolean(),
});

/**
 * Schema for partial email preferences update
 */
export const updateEmailPreferencesSchema = emailPreferencesSchema.partial();

// ==========================================
// Inferred Types
// ==========================================

export type EmailPreferences = z.infer<typeof emailPreferencesSchema>;

export type UpdateEmailPreferences = z.infer<
	typeof updateEmailPreferencesSchema
>;
