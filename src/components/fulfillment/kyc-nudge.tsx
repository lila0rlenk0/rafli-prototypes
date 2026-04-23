import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import {
	type ActionableKycStatus,
	getKycNudgeCopy,
} from '@/lib/utils/kyc-nudge';

interface KycNudgeProps {
	/** Narrowed status — the 'approved' case is filtered by the caller */
	status: ActionableKycStatus;
}

/**
 * KYC verification nudge shown to winners who haven't completed kyc_winner
 * verification.
 *
 * The parent (`FulfillmentTimeline`) filters 'approved' before rendering —
 * this component only receives statuses that need user attention or are
 * informational.
 *
 * Copy, icon, and CTA vary by status:
 * - 'none': never started — primary call to action
 * - 'draft': started but didn't finalize — resume
 * - 'in_review': finalized, admin review pending — informational only
 * - 'rejected': admin rejected — re-submit with reason hint
 *
 * This is a UX nudge only — it does NOT block the shipping form since the
 * backend is the authoritative enforcement boundary for claim eligibility.
 *
 * @param props - Actionable KYC status
 * @returns Banner JSX, styling keyed to the status semantic (info vs action)
 */
export function KycNudge({ status }: KycNudgeProps) {
	// in_review is purely informational — no CTA, no action needed from the winner.
	if (status === 'in_review') {
		return (
			<div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
				<Clock className="mt-0.5 size-5 shrink-0 text-blue-600" />
				<div className="flex-1">
					<p className="text-sm font-semibold text-blue-900">
						Identity verification under review
					</p>
					<p className="mt-1 text-sm text-blue-800">
						We&apos;ll notify you once your submission has been reviewed. You
						can still submit your shipping info in the meantime.
					</p>
				</div>
			</div>
		);
	}

	// TS narrows status to 'none' | 'draft' | 'rejected' after the in_review guard.
	const copy = getKycNudgeCopy(status);

	return (
		<div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
			{status === 'rejected' ? (
				<AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
			) : (
				<ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-600" />
			)}
			<div className="flex-1">
				<p className="text-sm font-semibold text-amber-900">{copy.title}</p>
				<p className="mt-1 text-sm text-amber-800">{copy.body}</p>
				<Link
					href="/verification"
					className="mt-3 inline-flex items-center gap-1 rounded-full border-2 border-amber-900 bg-amber-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-50 hover:text-amber-900"
				>
					<CheckCircle2 className="size-3" />
					{copy.cta}
				</Link>
			</div>
		</div>
	);
}
