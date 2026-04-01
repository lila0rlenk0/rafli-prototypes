'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Switch } from '@/components/ui/switch';
import { updateEmailPreferences } from '@/services/notification/update-email-preferences';
import type { EmailPreferences } from '@/types/email-preferences';

/**
 * Category configuration for email preference toggles
 *
 * Maps Figma design categories to backend preference keys.
 * "Marketing emails" maps to raffleLifecycle (product updates),
 * "Security emails" maps to hostNotifications (account security).
 */
const PREFERENCE_CATEGORIES = [
	{
		key: 'raffleLifecycle' as const,
		label: 'Marketing emails',
		description: 'Receive emails about new products, features, and more.',
	},
	{
		key: 'hostNotifications' as const,
		label: 'Security emails',
		description: 'Receive emails about your account security.',
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
