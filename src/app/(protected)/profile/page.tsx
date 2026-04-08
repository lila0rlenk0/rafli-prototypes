import { getSession } from '@/lib/auth/session';
import { getMe } from '@/services/user/get-me';
import { getVerificationStatus } from '@/services/kyc-submission/get-verification-status';
import { deriveAggregateStatus } from '@/types/verification-status';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { VerificationBadge } from '@/components/verification/verification-badge';
import { ProfileSidebar } from './profile-sidebar';
import {
	CreditsSection,
	EmailPreferencesSection,
	PaymentHistorySection,
	PersonalInformationSection,
	SecuritySection,
	VerificationSection,
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
		label: 'Verification',
		sectionId: 'verification',
	},
	{
		label: 'Email Preferences',
		sectionId: 'email-preferences',
	},
	{
		label: 'Credits',
		sectionId: 'credits',
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
	// Parallel fetch — session, profile, and verification status are independent
	const [session, meResult, verificationResult] = await Promise.all([
		getSession(),
		getMe(),
		getVerificationStatus(),
	]);
	const user = session?.user;
	const userProfile = meResult.success ? meResult.data : null;
	// Derive aggregate status from per-type breakdown for the profile badge.
	// Gracefully degrade — badge simply won't render if the endpoint fails.
	const verificationStatus = verificationResult.success
		? deriveAggregateStatus(verificationResult.data)
		: null;

	/**
	 * Renders the "My Profile" heading with the verification badge
	 * (visible for approved, in_review, rejected — hidden for none/draft).
	 */
	function renderProfileTitle() {
		return (
			<div className="flex items-center gap-2.5">
				<h1 className="font-clash-display text-[35px] leading-none font-semibold tracking-[0.35px] text-black">
					My Profile
				</h1>
				{verificationStatus && (
					<VerificationBadge
						status={verificationStatus.status}
						rejectionReason={verificationStatus.rejectionReason}
					/>
				)}
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			{/* Main Content Layout */}
			<div className="flex w-full flex-col gap-6 md:flex-row md:gap-8">
				{/* Header — mobile only: stacked above content */}
				<div className="flex flex-col gap-6 md:hidden">
					{renderProfileTitle()}
					<SignOutButton className="w-full sm:w-fit" />
				</div>

				{/* Left Sidebar — visible from tablet (md) onwards */}
				<ProfileSidebar items={SIDEBAR_ITEMS} />

				{/* Right Content Sections */}
				<div className="flex min-w-0 flex-1 flex-col gap-6">
					<div className="hidden items-center justify-between md:flex">
						{renderProfileTitle()}

						<SignOutButton />
					</div>

					{/* Personal Information */}
					<PersonalInformationSection
						user={user}
						profileName={userProfile?.name ?? null}
						avatarUrl={userProfile?.avatarUrl ?? null}
						bio={userProfile?.bio ?? null}
					/>

					{/* Verification */}
					<VerificationSection />

					{/* Security */}
					<SecuritySection />

					{/* Email Preferences */}
					<EmailPreferencesSection />

					{/* Credits */}
					<CreditsSection />

					{/* Payment History */}
					<PaymentHistorySection />
				</div>
			</div>
		</div>
	);
}
