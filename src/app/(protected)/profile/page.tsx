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
		label: 'Password',
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
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			{/* Main Content Layout */}
			<div className="flex w-full flex-col gap-6 md:flex-row md:gap-8">
				{/* Header — mobile only: stacked above content */}
				<div className="flex flex-col gap-6 md:hidden">
					<h1 className="font-clash-display text-[35px] leading-none font-semibold tracking-[0.35px] text-black">
						My Profile
					</h1>
					<SignOutButton className="w-full sm:w-fit" />
				</div>

				{/* Left Sidebar — visible from tablet (md) onwards */}
				<ProfileSidebar items={SIDEBAR_ITEMS} />

				{/* Right Content Sections */}
				<div className="flex min-w-0 flex-1 flex-col gap-6">
					<div className="hidden items-center justify-between md:flex">
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
