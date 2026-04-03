import Link from 'next/link';

import { KycStatusBadge } from '@/components/verification/kyc-status-badge';
import { formatDate } from '@/lib/utils/date-format';
import {
	getVerificationTypeLabel,
	type KycSubmissionSummary,
} from '@/types/kyc-submission';

interface SubmissionsListProps {
	submissions: KycSubmissionSummary[];
}

/**
 * Displays the user's existing KYC/KYB submissions as a card list.
 * Each card links to the submission detail page.
 *
 * @returns List of submission cards or null if empty
 */
export function SubmissionsList({ submissions }: SubmissionsListProps) {
	if (submissions.length === 0) return null;

	return (
		<div className="flex flex-col gap-3">
			<h2 className="font-clash-display text-xl font-semibold">
				Your Submissions
			</h2>
			{submissions.map(function renderSubmission(submission) {
				return (
					<Link
						key={submission.id}
						href={`/verification/${submission.id}`}
						className="flex items-center justify-between rounded-xl border bg-white p-5 transition-colors hover:border-black/30"
					>
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-semibold">
								{getVerificationTypeLabel(submission.type)}
							</span>
							<span className="text-muted-foreground text-xs">
								Submitted {formatDate(submission.submittedAt)}
							</span>
						</div>
						<KycStatusBadge status={submission.status} />
					</Link>
				);
			})}
		</div>
	);
}
