import { ArrowLeft, FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { KycStatusBadge } from '@/components/verification/kyc-status-badge';
import { getSession } from '@/lib/auth/session';
import { formatDate } from '@/lib/utils/date-format';
import {
	formatFieldLabel,
	formatFieldValue,
	formatNullableDate,
} from '@/lib/utils/format-field';
import { isImageType } from '@/lib/utils/mime';
import { getSubmissionDetail } from '@/services/kyc-submission/get-submission-detail';
import {
	getDocumentPurposeLabel,
	getVerificationTypeLabel,
	type KycDocument,
} from '@/types/kyc-submission';

interface SubmissionDetailPageProps {
	params: Promise<{ id: string }>;
}

/**
 * Renders a single document — image thumbnail or PDF file icon
 */
function DocumentCard({ doc }: { doc: KycDocument }) {
	const isImage = isImageType(doc.contentType) && doc.url;

	return (
		<div className="border-border flex flex-col overflow-hidden rounded-lg border">
			{isImage ? (
				<a
					href={doc.url!}
					target="_blank"
					rel="noopener noreferrer"
					className="bg-muted relative aspect-[4/3] w-full overflow-hidden transition-opacity hover:opacity-80"
				>
					<Image
						src={doc.url!}
						alt={doc.originalFilename}
						fill
						sizes="(max-width: 640px) 100vw, 50vw"
						className="object-cover"
						// Signed URLs change on every request — skip Next.js image optimization
						unoptimized
					/>
				</a>
			) : (
				<div className="bg-muted flex aspect-[4/3] w-full items-center justify-center">
					<FileText className="text-muted-foreground size-12" />
				</div>
			)}

			<div className="flex flex-col gap-1 p-3">
				<span className="text-sm font-medium">
					{getDocumentPurposeLabel(doc.purpose)}
				</span>
				<span className="text-muted-foreground truncate text-xs">
					{doc.originalFilename}
				</span>
				{doc.url && (
					<a
						href={doc.url}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-1 text-xs font-medium underline underline-offset-4"
					>
						{isImage ? 'View full size' : 'Download'}
					</a>
				)}
			</div>
		</div>
	);
}

/**
 * User-facing submission detail page.
 * Shows the form data and documents the user submitted,
 * along with status, dates, and rejection reason if applicable.
 *
 * @returns Detail page with submission data cards
 */
export default async function SubmissionDetailPage({
	params,
}: SubmissionDetailPageProps) {
	const session = await getSession();
	if (!session?.user) redirect('/');

	const { id } = await params;
	const result = await getSubmissionDetail(id);

	if (!result.success) {
		notFound();
	}

	const detail = result.data;

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
			{/* Back link */}
			<Link
				href="/verification"
				className="text-muted-foreground flex items-center gap-1.5 text-sm transition-colors hover:text-black"
			>
				<ArrowLeft className="size-4" />
				Back to verification
			</Link>

			{/* Header card — type, status, dates */}
			<div className="rounded-2xl bg-white p-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-1">
						<h1 className="font-clash-display text-3xl font-semibold text-black">
							{getVerificationTypeLabel(detail.type)}
						</h1>
						<p className="text-muted-foreground text-sm">
							Submitted {formatDate(detail.submittedAt)}
						</p>
					</div>
					<KycStatusBadge status={detail.status} />
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

				{/* Rejection reason */}
				{detail.rejectionReason && (
					<div className="mt-4 rounded-lg bg-red-50 p-4">
						<p className="text-sm font-medium text-red-700">Rejection Reason</p>
						<p className="mt-1 text-sm text-red-600">
							{detail.rejectionReason}
						</p>
					</div>
				)}
			</div>

			{/* Form data card */}
			<div className="rounded-2xl bg-white p-8">
				<h2 className="font-clash-display mb-5 text-xl font-semibold">
					Submitted Information
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

			{/* Documents card */}
			{detail.documents.length > 0 && (
				<div className="rounded-2xl bg-white p-8">
					<h2 className="font-clash-display mb-5 text-xl font-semibold">
						Documents
					</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{detail.documents.map(function renderDocument(doc) {
							return <DocumentCard key={doc.id} doc={doc} />;
						})}
					</div>
				</div>
			)}
		</div>
	);
}
