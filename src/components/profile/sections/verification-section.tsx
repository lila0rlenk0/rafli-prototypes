import Link from 'next/link';

import { KycStatusBadge } from '@/components/verification/badges/kyc-status-badge';
import { Button } from '@/components/ui/button';
import { getMySubmissions } from '@/services/kyc-submission/get-my-submissions';
import { getVerificationTypeLabel } from '@/lib/verification/labels';
import { formatDate } from '@/lib/utils/format/date-format';
import { type KycSubmissionSummary } from '@/types/kyc-submission';

/**
 * VerificationSection Component
 *
 * Server component showing the user's KYC/KYB submissions in the profile.
 * Each row displays the verification type, submission date, and current status.
 * Links to the verification page for new submissions or detail pages for existing ones.
 *
 * @returns Card with submissions list and "Start Verification" link
 */
export async function VerificationSection() {
	const result = await getMySubmissions();
	const submissions = result.success ? result.data.submissions : [];

	function renderSubmissionRow(submission: KycSubmissionSummary) {
		return (
			<Link
				key={submission.id}
				href={`/verification/${submission.id}`}
				className="flex items-center justify-between py-3 transition-colors hover:opacity-70"
			>
				<div className="flex flex-col gap-0.5">
					<span className="text-base font-medium">
						{getVerificationTypeLabel(submission.type)}
					</span>
					<span className="text-muted-foreground text-sm">
						{formatDate(submission.submittedAt)}
					</span>
				</div>
				<KycStatusBadge status={submission.status} />
			</Link>
		);
	}

	return (
		<div
			className="relative flex w-full flex-col gap-6 overflow-hidden rounded-3xl bg-white px-6 py-10 md:px-10 md:py-12"
			id="verification"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<h3 className="font-clash-display text-headline-sm flex-1 font-semibold text-black">
					Verification
				</h3>
				<Link href="/verification">
					<Button
						variant="outline"
						size="sm"
						className="border-black text-sm font-semibold text-black/95 hover:bg-black hover:text-white"
					>
						{submissions.length === 0
							? 'Start Verification'
							: 'New Verification'}
					</Button>
				</Link>
			</div>

			{submissions.length === 0 ? (
				<p className="text-muted-foreground py-4 text-center text-sm">
					No verifications submitted yet
				</p>
			) : (
				<div className="flex flex-col">
					{submissions.map(renderSubmissionRow)}
				</div>
			)}
		</div>
	);
}
