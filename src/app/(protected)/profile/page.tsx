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
		label: 'Address Information',
		sectionId: 'security',
	},
	{
		label: 'Payment Details',
		sectionId: 'email-preferences',
	},
	{
		label: 'Login',
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
		<div className="container mx-auto flex max-w-6xl flex-col gap-8 px-4">
			{/* Main Content Layout */}
			<div className="flex w-full flex-col gap-8 md:flex-row">
				{/* Left Sidebar */}
				<ProfileSidebar items={SIDEBAR_ITEMS} />

				{/* Right Content Sections */}
				<div className="flex w-full max-w-[922px] flex-col gap-6">
					<div className="flex items-center justify-between">
						<h1 className="font-clash-display text-[35px] leading-none font-semibold tracking-[0.35px] text-black">
							My Profile
						</h1>

						<SignOutButton />
					</div>

					{/* Personal Information */}
					<PersonalInformationSection
						user={user}
						profileName={userProfile?.name ?? null}
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
