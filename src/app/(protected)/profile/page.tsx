import { getSession } from '@/lib/auth/session';
import { getMe } from '@/services/user/get-me';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { ProfileSidebar } from './profile-sidebar';
import {
	EmailPreferencesSection,
	PaymentHistorySection,
	PersonalInformationSection,
	SecuritySection,
} from './sections';

/**
 * Sidebar items configuration
 *
 * Defines the checklist items displayed in the profile sidebar.
 * Each item represents a section of the profile that needs to be completed.
 */
const SIDEBAR_ITEMS = [
	{
		label: 'Personal Information',
		sectionId: 'personal-information',
	},
	{
		label: 'Security',
		sectionId: 'security',
	},
	{
		label: 'Email Preferences',
		sectionId: 'email-preferences',
	},
	{
		label: 'Payment History',
		sectionId: 'payment-history',
	},
];

/**
 * ProfilePage Component
 *
 * Displays the user's complete profile information organized in sections.
 * Includes a sidebar showing completion progress and multiple content
 * sections for personal info, address, payment details, login, and host info.
 */
export default async function ProfilePage() {
	// Parallel fetch — session and profile are independent
	const [session, meResult] = await Promise.all([getSession(), getMe()]);
	const user = session?.user;
	const userProfile = meResult.success ? meResult.data : null;

	return (
		<div className="flex flex-col gap-8 px-4">
			{/* Main Content Layout */}
			<div className="flex w-full flex-col gap-10 md:flex-row">
				{/* Left Sidebar */}
				<ProfileSidebar items={SIDEBAR_ITEMS} />

				{/* Right Content Sections */}
				<div className="flex w-full max-w-195 flex-col gap-8">
					<div className="flex items-center justify-between">
						<h1 className="font-clash-display text-3xl font-semibold text-black">
							My Profile
						</h1>

						<SignOutButton />
					</div>

					{/* Personal Information */}
					<PersonalInformationSection
						user={user}
						avatarUrl={userProfile?.avatarUrl ?? null}
						bio={userProfile?.bio ?? null}
					/>

					{/* Security */}
					<SecuritySection />

					{/* Email Preferences */}
					<EmailPreferencesSection />

					{/* Payment History */}
					<PaymentHistorySection />
				</div>
			</div>
		</div>
	);
}
