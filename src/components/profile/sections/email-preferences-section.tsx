import { getEmailPreferences } from '@/services/notification/get-email-preferences';

import { EmailPreferencesForm } from './email-preferences-form';

/**
 * EmailPreferencesSection Component
 *
 * Server component that fetches email preferences and renders the form.
 *
 * @returns Card with email preference toggles
 */
export async function EmailPreferencesSection() {
	const result = await getEmailPreferences();
	const preferences = result.success ? result.data : null;

	return (
		<div
			className="relative flex w-full flex-col gap-6 overflow-hidden rounded-3xl bg-white px-6 py-10 md:px-10 md:py-12"
			id="email-preferences"
		>
			<div className="flex flex-col gap-2">
				<h3 className="font-clash-display text-h3 font-semibold text-black">
					Email Preferences
				</h3>
				<p className="text-base leading-relaxed text-[#7B7B7B]">
					Choose which email notifications you want to receive
				</p>
			</div>

			<EmailPreferencesForm preferences={preferences} />
		</div>
	);
}
