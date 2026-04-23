'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Switch } from '@/components/ui/switch';
import { updateEmailPreferences } from '@/services/notification/update-email-preferences';
import type { EmailPreferences } from '@/types/email-preferences';

/**
 * Category configuration for email preference toggles.
 *
 * All four backend categories are transactional (performance-of-contract
 * under GDPR Art. 6(1)(b)), not marketing — there is currently no
 * standalone marketing channel in the email preferences schema, so no
 * GDPR/PECR consent gate applies to these toggles. They remain opt-out
 * defaults for user convenience.
 *
 * Labels match the underlying purpose of each backend preference so users
 * understand exactly what they are toggling rather than guessing from a
 * generic label like "Marketing emails".
 */
const PREFERENCE_CATEGORIES = [
	{
		key: 'raffleLifecycle' as const,
		label: 'Sweepstakes Updates',
		description:
			"Emails when sweepstakes you're entered in start, end, or are cancelled.",
	},
	{
		key: 'prizeUpdates' as const,
		label: 'Prize Updates',
		description:
			'Emails when you win a prize or when prize fulfillment status changes.',
	},
	{
		key: 'hostNotifications' as const,
		label: 'Host Notifications',
		description:
			'Emails about participants, payments, and admin actions on sweepstakes you host.',
	},
	{
		key: 'reviewNotifications' as const,
		label: 'Reviews',
		description:
			'Emails about new reviews left on your hosted sweepstakes or your profile.',
	},
] as const;

interface EmailPreferencesFormProps {
	preferences: EmailPreferences | null;
}

/**
 * Client form for toggling email notification preferences
 *
 * Each switch triggers an individual PATCH with optimistic update + rollback on failure.
 *
 * @returns List of email preference toggles
 */
export function EmailPreferencesForm({
	preferences,
}: EmailPreferencesFormProps) {
	// Local state mirrors server preferences — enables optimistic updates with rollback
	const [state, setState] = useState<EmailPreferences | null>(preferences);
	// useTransition: keeps the toggle interactive during server action calls
	const [isPending, startTransition] = useTransition();

	if (!state) {
		return (
			<p className="text-muted-foreground py-4 text-center text-sm">
				Unable to load email preferences
			</p>
		);
	}

	/**
	 * Handles toggling a single preference with optimistic update
	 */
	function handleToggle(key: keyof EmailPreferences) {
		if (!state) return;

		const previousState = state;
		const newValue = !state[key];

		// Optimistic update
		setState({ ...state, [key]: newValue });

		startTransition(async () => {
			const result = await updateEmailPreferences({ [key]: newValue });

			if (!result.success) {
				setState(previousState);
				toast.error('Failed to update preference. Please try again.');
				return;
			}

			setState(result.data);
		});
	}

	return (
		<div className="flex flex-col">
			{PREFERENCE_CATEGORIES.map(function renderCategory(category, index) {
				return (
					<div
						key={category.key}
						className={`flex items-center justify-between gap-4 py-3 ${
							index > 0 ? 'border-t border-gray-100' : ''
						}`}
					>
						<div className="flex flex-col gap-0.5">
							<span className="text-base font-medium">{category.label}</span>
							<span className="text-muted-foreground text-sm">
								{category.description}
							</span>
						</div>
						<Switch
							checked={state[category.key]}
							onCheckedChange={() => handleToggle(category.key)}
							disabled={isPending}
							aria-label={category.label}
						/>
					</div>
				);
			})}
		</div>
	);
}
