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
			className="relative flex w-full flex-col gap-6 rounded-3xl bg-white px-10 py-15"
			id="email-preferences"
		>
			<div className="flex flex-col gap-2">
				<h3 className="font-clash-display text-2xl leading-[1.1] font-semibold tracking-[0.12px] text-black">
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
