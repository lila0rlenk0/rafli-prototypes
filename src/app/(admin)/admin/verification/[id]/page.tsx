import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DocumentViewer } from '@/components/admin/verification/detail/document-viewer';
import {
	PiiContent,
	PiiHiddenPlaceholder,
	PiiRevealProvider,
	PiiRevealToggle,
} from '@/components/admin/verification/detail/pii-reveal';
import { ReviewForm } from '@/components/admin/verification/detail/review-form';
import { KycStatusBadge } from '@/components/verification/badges/kyc-status-badge';
import { formatDate } from '@/lib/utils/format/date-format';
import {
	formatFieldLabel,
	formatFieldValue,
	formatNullableDate,
} from '@/lib/utils/format/format-field';
import { getSubmissionDetail } from '@/services/admin-kyc/get-submission-detail';
import { getVerificationTypeLabel } from '@/lib/verification/labels';
import { KYC_SUBMISSION_STATUS } from '@/types/kyc-submission';

interface SubmissionDetailPageProps {
	params: Promise<{ id: string }>;
}

/**
 * Admin Submission Detail Page (Server Component)
 *
 * Data-fetching strategy: fetches submission detail by ID server-side.
 * Returns 404 on failure — hides existence of submissions from unauthorized users.
 * No caching — admin reviews must always show the latest status.
 *
 * PII is hidden by default: identity (name/email), form data, and documents are
 * wrapped in a client-side reveal gate (see `pii-reveal.tsx`). The admin must
 * click an explicit toggle to view sensitive content — reduces shoulder-surfing
 * and incidental exposure while paging through the review queue.
 *
 * @returns Detail page with cards for each data section, PII gated behind reveal
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
		// Provider scopes reveal state to this page — no persistence across
		// navigations, so each new submission starts hidden again.
		<PiiRevealProvider>
			<div className="flex flex-col gap-6">
				{/* Back link + reveal toggle — toggle sits above all PII so the admin
				    can flip it before sensitive content scrolls into view. */}
				<div className="flex items-center justify-between gap-4">
					<Link
						href="/admin/verification"
						className="text-muted-foreground flex items-center gap-1.5 text-sm transition-colors hover:text-black"
					>
						<ArrowLeft className="size-4" />
						Back to list
					</Link>
					<PiiRevealToggle />
				</div>

				{/* Header card — identity is PII (gated); type/status/dates are not. */}
				<div className="rounded-2xl bg-white p-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<PiiContent
							fallback={
								// Placeholder mirrors the h1 + email line of the revealed
								// layout so the card's vertical rhythm doesn't jump on toggle.
								<div className="flex flex-col gap-1">
									<h1 className="font-clash-display text-muted-foreground text-3xl font-semibold">
										•••••• ••••••
									</h1>
									<p className="text-muted-foreground text-sm">
										••••••@••••••.•••
									</p>
								</div>
							}
						>
							<div className="flex flex-col gap-1">
								<h1 className="font-clash-display text-3xl font-semibold text-black">
									{detail.userName ?? 'Unknown User'}
								</h1>
								<p className="text-muted-foreground text-sm">
									{detail.userEmail ?? '—'}
								</p>
							</div>
						</PiiContent>

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
					{detail.rejectionReason ? (
						<div className="mt-4 rounded-lg bg-red-50 p-4">
							<p className="text-sm font-medium text-red-700">
								Rejection Reason
							</p>
							<p className="mt-1 text-sm text-red-600">
								{detail.rejectionReason}
							</p>
						</div>
					) : null}
				</div>

				{/* Form data card — all submitted fields as readonly key-value pairs.
				    Entire field list is PII (names, addresses, IDs, dates of birth). */}
				<div className="rounded-2xl bg-white p-8">
					<h2 className="font-clash-display mb-5 text-xl font-semibold">
						Form Data
					</h2>
					<PiiContent fallback={<PiiHiddenPlaceholder label="Form data" />}>
						<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{Object.entries(detail.data).map(function renderField([
								key,
								value,
							]) {
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
					</PiiContent>
				</div>

				{/* Documents card — uploaded identity/proof documents. Thumbnails
				    render the actual image/PDF, so the whole viewer is gated. */}
				<div className="rounded-2xl bg-white p-8">
					<h2 className="font-clash-display mb-5 text-xl font-semibold">
						Documents
					</h2>
					<PiiContent
						fallback={<PiiHiddenPlaceholder label="Uploaded documents" />}
					>
						<DocumentViewer documents={detail.documents} />
					</PiiContent>
				</div>

				{/* Review actions — only for pending submissions. Not gated: the
				    approve/reject controls themselves aren't PII. */}
				{isPending ? (
					<div className="rounded-2xl bg-white p-8">
						<h2 className="font-clash-display text-xl font-semibold">Review</h2>
						<p className="text-muted-foreground mt-1 mb-4 text-sm">
							Approve or reject this submission. The user will be notified by
							email.
						</p>
						<ReviewForm submissionId={detail.id} />
					</div>
				) : null}
			</div>
		</PiiRevealProvider>
	);
}
