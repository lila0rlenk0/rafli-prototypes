import { PROFILE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { getSession } from '@/lib/auth/session';
import { getMe } from '@/services/user/get-me';
import { getVerificationStatus } from '@/services/kyc-submission/get-verification-status';
import { deriveAggregateStatus } from '@/lib/verification/aggregate-status';

import { SignOutButton } from '@/components/auth/sign-out/button';
import { VerificationBadge } from '@/components/verification/badges/badge';
import { CreditCodeRedeem } from '@/components/profile/credit-code-redeem';
import { ProfileSidebar } from '@/components/profile/sidebar';
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
	// Credits surfaced second per Figma — the credits / subscription summary is
	// the most-actionable card for returning users (top-up, upgrade), so it
	// sits directly under personal info before the longer compliance + prefs
	// stack.
	{
		label: 'Credits',
		sectionId: 'credits',
	},
	{
		label: 'Verification',
		sectionId: 'verification',
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

	// Deferred — view tracking runs after the RSC payload ships
	if (user?.id) {
		await trackAfter(
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
			<h1 className="font-clash-display text-headline-md font-semibold text-black">
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
			<div className="flex w-full flex-col gap-6 md:flex-row md:gap-8">
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

					{/* Redemption affordance — sits as its own card above the
					    credits summary so the input lives on a dedicated surface
					    rather than competing with the balance grid for the
					    visual anchor of the Credits card. Open to subscribers
					    and non-subscribers alike (admin grants + partner
					    promos). */}
					<CreditCodeRedeem />

					{/* Credits — second slot per Figma. Sits before the longer
					    compliance + preferences stack because credit balance and
					    subscription state are the cards returning users act on
					    most often. */}
					<CreditsSection />

					{/* Verification */}
					<VerificationSection />

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
