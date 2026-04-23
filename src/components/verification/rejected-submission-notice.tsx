import { XCircle } from 'lucide-react';

import { getVerificationTypeLabel } from '@/lib/verification/labels';
import { type KycSubmissionSummary } from '@/types/kyc-submission';

interface RejectedSubmissionNoticeProps {
	submission: KycSubmissionSummary;
	/** Rejection reason from the verification status endpoint — null if unavailable */
	rejectionReason: string | null;
}

/**
 * Banner displayed above the verification form when the user's previous
 * submission was rejected. Shows the rejection reason so the user
 * understands what to fix before resubmitting.
 *
 * Non-blocking — the multi-step form renders directly below this notice.
 *
 * @returns Compact rejection banner with reason and type label
 */
export function RejectedSubmissionNotice({
	submission,
	rejectionReason,
}: RejectedSubmissionNoticeProps) {
	return (
		<div className="mb-8 flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center">
			{/* Red circle icon — draws attention to the rejection status */}
			<div className="flex size-14 items-center justify-center rounded-full bg-red-50">
				<XCircle className="size-7 text-red-600" />
			</div>

			<div className="flex flex-col gap-1">
				<h2 className="font-clash-display text-xl font-semibold">
					Verification Rejected
				</h2>
				<p className="text-muted-foreground text-sm">
					Your {getVerificationTypeLabel(submission.type)} verification was not
					approved.
					{/* Show rejection reason if the status endpoint provided one */}
					{rejectionReason ? (
						<>
							<br />
							<span className="font-medium text-red-700">
								Reason: {rejectionReason}
							</span>
						</>
					) : null}
				</p>
			</div>

			<p className="text-muted-foreground text-sm">
				You can resubmit your verification below.
			</p>
		</div>
	);
}
