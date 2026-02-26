import { getEmailPreferences } from '@/services/notification/get-email-preferences';

import { EmailPreferencesForm } from './email-preferences-form';

/**
 * EmailPreferencesSection Component
 *
 * Server component that fetches email preferences and renders the form.
 * Includes a footer note about transactional emails.
 */
export async function EmailPreferencesSection() {
	const result = await getEmailPreferences();
	const preferences = result.success ? result.data : null;

	return (
		<div
			className="relative flex w-full flex-col gap-4 rounded-2xl bg-white p-8"
			id="email-preferences"
		>
			<div className="flex flex-col gap-1">
				<h2 className="text-lg font-semibold">Email Preferences</h2>
				<span className="text-muted-foreground text-sm">
					Choose which email notifications you want to receive
				</span>
			</div>

			<EmailPreferencesForm preferences={preferences} />

			<p className="text-muted-foreground border-t pt-4 text-xs">
				Transactional emails (account verification, password resets, purchase
				confirmations) are always sent and cannot be disabled.
			</p>
		</div>
	);
}
