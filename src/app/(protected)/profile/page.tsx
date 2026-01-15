import { getSession } from '@/lib/auth/session';

import { ProfileSidebar } from './profile-sidebar';
import { PersonalInformationSection } from './sections';

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
];

/**
 * ProfilePage Component
 *
 * Displays the user's complete profile information organized in sections.
 * Includes a sidebar showing completion progress and multiple content
 * sections for personal info, address, payment details, login, and host info.
 */
export default async function ProfilePage() {
	const session = await getSession();
	const user = session?.user;

	return (
		<div className="flex flex-col gap-8 px-4">
			{/* Page Title */}
			<h1 className="font-clash-display text-3xl font-semibold text-black">
				My Profile
			</h1>

			{/* Main Content Layout */}
			<div className="flex w-full flex-col gap-4 md:flex-row">
				{/* Left Sidebar */}
				<ProfileSidebar items={SIDEBAR_ITEMS} />

				{/* Right Content Sections */}
				<div className="flex w-full max-w-195 flex-col gap-4">
					{/* Personal Information */}
					<PersonalInformationSection user={user} />
				</div>
			</div>
		</div>
	);
}
