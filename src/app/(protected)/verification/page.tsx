import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth/session';
import { getMySubmissions } from '@/services/kyc-submission/get-my-submissions';
import { getVerificationStatus } from '@/services/kyc-submission/get-verification-status';
import {
	KYC_SUBMISSION_STATUS,
	VERIFICATION_TYPE,
} from '@/types/kyc-submission';
import { FormHeader } from './form-header';
import { FormStepComponent } from './form-step-component';
import { getCurrentRejectedSubmissionNotice } from './page-helpers';
import { RejectedSubmissionNotice } from './rejected-submission-notice';
import { SubmissionsList } from './submissions-list';
import { VerificationFormProvider } from './verification-form-provider';

/**
 * Checks if a submission is currently active (pending review or approved).
 * Active submissions block new submissions of the same type on the backend.
 */
function isActive(status: string): boolean {
	return (
		status === KYC_SUBMISSION_STATUS.PENDING ||
		status === KYC_SUBMISSION_STATUS.APPROVED
	);
}

/**
 * Verification Page
 *
 * Shows the user's existing KYC/KYB submissions and a multi-step form
 * to start a new verification. Users can submit all three types
 * (individual host, company host, raffle winner). The form is hidden
 * only when all types have active (pending/approved) submissions.
 */
export default async function VerificationPage() {
	const session = await getSession();

	if (!session?.user) {
		redirect('/');
	}

	const userEmail = session.user.email || '';

	// Parallel fetch — submissions list and verification status are independent
	const [submissionsResult, statusResult] = await Promise.all([
		getMySubmissions(),
		getVerificationStatus(),
	]);
	const submissions = submissionsResult.success
		? submissionsResult.data.submissions
		: [];

	// Backend enforces per-type uniqueness — the form is blocked only when all
	// verification types have active submissions. Derived from VERIFICATION_TYPE
	// so adding a new type auto-updates the threshold.
	const activeCount = submissions.filter(s => isActive(s.status)).length;
	const allTypesActive = activeCount >= Object.keys(VERIFICATION_TYPE).length;

	const statusData = statusResult.success ? statusResult.data : null;
	const rejectedNotice = getCurrentRejectedSubmissionNotice(
		submissions,
		statusData,
	);

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-8">
			{/* Existing submissions — always visible when present */}
			<SubmissionsList submissions={submissions} />

			{/* Rejection banner — only when the user has a rejected submission */}
			{rejectedNotice ? (
				<RejectedSubmissionNotice
					submission={rejectedNotice.submission}
					rejectionReason={rejectedNotice.rejectionReason}
				/>
			) : null}

			{/* Multi-step form — hidden when all types are covered */}
			{!allTypesActive ? (
				<VerificationFormProvider userEmail={userEmail}>
					<FormHeader />
					<FormStepComponent />
				</VerificationFormProvider>
			) : null}
		</div>
	);
}
