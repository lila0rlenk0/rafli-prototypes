import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { KycStatusBadge } from '@/components/verification/kyc-status-badge';
import { formatDate } from '@/lib/utils/date-format';
import {
	formatFieldLabel,
	formatFieldValue,
	formatNullableDate,
} from '@/lib/utils/format-field';
import { getSubmissionDetail } from '@/services/admin-kyc/get-submission-detail';
import {
	KYC_SUBMISSION_STATUS,
	getVerificationTypeLabel,
} from '@/types/kyc-submission';

import { DocumentViewer } from './document-viewer';
import { ReviewForm } from './review-form';

interface SubmissionDetailPageProps {
	params: Promise<{ id: string }>;
}

/**
 * Admin Submission Detail Page
 *
 * Displays full KYC submission detail for admin review including:
 * form data, uploaded documents, and approve/reject actions for
 * pending submissions.
 *
 * @returns Detail page with cards for each data section
 */
export default async function SubmissionDetailPage({
	params,
}: SubmissionDetailPageProps) {
	const { id } = await params;
	const result = await getSubmissionDetail(id);

	if (!result.success) {
		notFound();
	}

	const detail = result.data;
	const isPending = detail.status === KYC_SUBMISSION_STATUS.PENDING;

	return (
		<div className="flex flex-col gap-6">
			{/* Back link */}
			<Link
				href="/admin/verification"
				className="text-muted-foreground flex items-center gap-1.5 text-sm transition-colors hover:text-black"
			>
				<ArrowLeft className="size-4" />
				Back to list
			</Link>

			{/* Header card — user info, type, status, dates */}
			<div className="rounded-2xl bg-white p-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-1">
						<h1 className="font-clash-display text-3xl font-semibold text-black">
							{detail.userName ?? 'Unknown User'}
						</h1>
						<p className="text-muted-foreground text-sm">
							{detail.userEmail ?? '—'}
						</p>
					</div>

					<div className="flex items-center gap-2">
						{/* Type label — e.g. "Individual Host" */}
						<span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
							{getVerificationTypeLabel(detail.type)}
						</span>
						<KycStatusBadge status={detail.status} />
					</div>
				</div>

				{/* Date metadata */}
				<div className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
					<div className="flex flex-col gap-0.5">
						<span className="text-muted-foreground">Submitted</span>
						<p className="font-medium">{formatDate(detail.submittedAt)}</p>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-muted-foreground">Finalized</span>
						<p className="font-medium">
							{formatNullableDate(detail.finalizedAt)}
						</p>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-muted-foreground">Reviewed</span>
						<p className="font-medium">
							{formatNullableDate(detail.reviewedAt)}
						</p>
					</div>
				</div>

				{/* Rejection reason — shown when status is rejected */}
				{detail.rejectionReason && (
					<div className="mt-4 rounded-lg bg-red-50 p-4">
						<p className="text-sm font-medium text-red-700">Rejection Reason</p>
						<p className="mt-1 text-sm text-red-600">
							{detail.rejectionReason}
						</p>
					</div>
				)}
			</div>

			{/* Form data card — all submitted fields as readonly key-value pairs */}
			<div className="rounded-2xl bg-white p-8">
				<h2 className="font-clash-display mb-5 text-xl font-semibold">
					Form Data
				</h2>
				<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{Object.entries(detail.data).map(function renderField([key, value]) {
						return (
							<div key={key} className="flex flex-col gap-0.5">
								<dt className="text-muted-foreground text-sm">
									{formatFieldLabel(key)}
								</dt>
								<dd className="text-sm font-medium">
									{formatFieldValue(value)}
								</dd>
							</div>
						);
					})}
				</dl>
			</div>

			{/* Documents card — uploaded identity/proof documents */}
			<div className="rounded-2xl bg-white p-8">
				<h2 className="font-clash-display mb-5 text-xl font-semibold">
					Documents
				</h2>
				<DocumentViewer documents={detail.documents} />
			</div>

			{/* Review actions — only for pending submissions */}
			{isPending && (
				<div className="rounded-2xl bg-white p-8">
					<h2 className="font-clash-display text-xl font-semibold">Review</h2>
					<p className="text-muted-foreground mt-1 mb-4 text-sm">
						Approve or reject this submission. The user will be notified by
						email.
					</p>
					<ReviewForm submissionId={detail.id} />
				</div>
			)}
		</div>
	);
}
