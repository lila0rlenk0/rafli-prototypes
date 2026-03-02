'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Switch } from '@/components/ui/switch';
import { updateEmailPreferences } from '@/services/notification/update-email-preferences';
import type { EmailPreferences } from '@/types/email-preferences';

/**
 * Category configuration for email preference toggles
 */
const PREFERENCE_CATEGORIES = [
	{
		key: 'raffleLifecycle' as const,
		label: 'Raffle Updates',
		description: 'Published, live, ended, winners selected notifications',
	},
	{
		key: 'prizeUpdates' as const,
		label: 'Prize Updates',
		description: 'Shipping/delivery status, claim reminders',
	},
	{
		key: 'hostNotifications' as const,
		label: 'Host Notifications',
		description: 'Winner claimed, delivery confirmed, fulfillment reminders',
	},
	{
		key: 'reviewNotifications' as const,
		label: 'Reviews',
		description: 'New reviews, rate experience reminders',
	},
] as const;

interface EmailPreferencesFormProps {
	preferences: EmailPreferences | null;
}

/**
 * Client form for toggling email notification preferences
 *
 * Each switch triggers an individual PATCH with optimistic update + rollback on failure.
 */
export function EmailPreferencesForm({
	preferences,
}: EmailPreferencesFormProps) {
	const [state, setState] = useState<EmailPreferences | null>(preferences);
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
		<div className="flex flex-col gap-4">
			{PREFERENCE_CATEGORIES.map(function renderCategory(category) {
				return (
					<div
						key={category.key}
						className="flex items-center justify-between gap-4 py-2"
					>
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-medium">{category.label}</span>
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
