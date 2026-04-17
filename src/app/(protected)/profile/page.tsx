import { PROFILE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { getSession } from '@/lib/auth/session';
import { getMe } from '@/services/user/get-me';
import { getVerificationStatus } from '@/services/kyc-submission/get-verification-status';
import { deriveAggregateStatus } from '@/types/verification-status';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { VerificationBadge } from '@/components/verification/verification-badge';
import { ProfileSidebar } from '@/components/profile/profile-sidebar';
import {
	CreditsSection,
	EmailPreferencesSection,
	PaymentHistorySection,
	PersonalInformationSection,
	SecuritySection,
	VerificationSection,
} from '@/components/profile/sections';

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
 * ProfilePage (Server Component)
 *
 * Data-fetching strategy: parallel-fetches session, /me profile, and verification
 * status — three independent endpoints. Each section below is either a server
 * component with its own fetch (VerificationSection, CreditsSection, etc.) or
 * receives data as props from this parent fetch.
 *
 * Displays the user's complete profile information organized in sections.
 */
export default async function ProfilePage() {
	// Parallel fetch — session, profile, and verification status are independent
	const [session, meResult, verificationResult] = await Promise.all([
		getSession(),
		getMe(),
		getVerificationStatus(),
	]);
	const user = session?.user;

	// Fire-and-forget — profile view tracking for engagement metrics
	if (user?.id) {
		void trackServer(
			PROFILE_EVENTS.VIEWED,
			{
				has_verification: verificationResult.success,
			},
			{ userId: user.id },
		);
	}
	const userProfile = meResult.success ? meResult.data : null;
	// Derive aggregate status from per-type breakdown for the profile badge.
	// Gracefully degrade — badge simply won't render if the endpoint fails.
	const verificationStatus = verificationResult.success
		? deriveAggregateStatus(verificationResult.data)
		: null;

	// Reused in mobile header and desktop header — extracted as JSX variable
	// to avoid a render function while keeping the markup DRY.
	const profileTitle = (
		<div className="flex items-center gap-2.5">
			<h1 className="font-clash-display text-h2 font-semibold text-black">
				My Profile
			</h1>
			{verificationStatus ? (
				<VerificationBadge
					status={verificationStatus.status}
					rejectionReason={verificationStatus.rejectionReason}
				/>
			) : null}
		</div>
	);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			{/* Main Content Layout */}
			<div className="flex w-full flex-col gap-6 md:flex-row md:gap-[32px]">
				{/* Header — mobile only: stacked above content */}
				<div className="flex flex-col gap-6 md:hidden">
					{profileTitle}
					<SignOutButton className="w-full sm:w-fit" />
				</div>

				{/* Left Sidebar — visible from tablet (md) onwards */}
				<ProfileSidebar items={SIDEBAR_ITEMS} />

				{/* Right Content Sections */}
				<div className="flex min-w-0 flex-1 flex-col gap-6">
					<div className="hidden items-center justify-between md:flex">
						{profileTitle}

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
