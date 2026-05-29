import { ArrowLeft, FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { KycStatusBadge } from '@/components/verification/badges/kyc-status-badge';
import { requireAuth } from '@/lib/auth/session';
import { formatDate } from '@/lib/utils/format/date-format';
import {
	formatFieldLabel,
	formatFieldValue,
	formatNullableDate,
} from '@/lib/utils/format/format-field';
import {
	getPdfPreviewUrl,
	isImageType,
	isPdfType,
} from '@/lib/utils/media/mime';
import {
	getDocumentPurposeLabel,
	getVerificationTypeLabel,
} from '@/lib/verification/labels';
import { getSubmissionDetail } from '@/services/kyc-submission/get-submission-detail';
import { type KycDocument } from '@/types/kyc-submission';

interface SubmissionDetailPageProps {
	params: Promise<{ id: string }>;
}

interface DocumentPreviewProps {
	url: string | null;
	isImage: boolean;
	isPdf: boolean;
	filename: string;
}

/**
 * Renders the image / PDF iframe / fallback icon for a single document.
 * @returns Preview node for the document card body
 */
function DocumentPreview({
	url,
	isImage,
	isPdf,
	filename,
}: DocumentPreviewProps) {
	if (isImage && url !== null) {
		return (
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="bg-muted aspect-card relative w-full overflow-hidden transition-opacity hover:opacity-80"
			>
				<Image
					src={url}
					alt={filename}
					fill
					sizes="(max-width: 640px) 100vw, 50vw"
					className="object-cover"
					// signed URLs change on every request — skip Next.js image optimization
					unoptimized
				/>
			</a>
		);
	}
	if (isPdf && url !== null) {
		return (
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="bg-muted aspect-card relative block w-full overflow-hidden transition-opacity hover:opacity-80"
			>
				<iframe
					src={getPdfPreviewUrl(url)}
					title={`PDF thumbnail: ${filename}`}
					className="pointer-events-none size-full border-0 bg-white"
					aria-hidden="true"
					tabIndex={-1}
				/>
			</a>
		);
	}
	return (
		<div className="bg-muted aspect-card flex w-full items-center justify-center">
			<FileText className="text-muted-foreground size-12" />
		</div>
	);
}

/**
 * Renders a single document card — preview + filename + open link.
 * @returns Card node for one KYC document
 */
function DocumentCard({ doc }: { doc: KycDocument }) {
	const url = doc.url;
	const isImage = url !== null && isImageType(doc.contentType);
	const isPdf = url !== null && isPdfType(doc.contentType);

	return (
		<div className="border-border flex flex-col overflow-hidden rounded-lg border">
			<DocumentPreview
				url={url}
				isImage={isImage}
				isPdf={isPdf}
				filename={doc.originalFilename}
			/>

			<div className="flex flex-col gap-1 p-3">
				<span className="text-sm font-medium">
					{getDocumentPurposeLabel(doc.purpose)}
				</span>
				<span className="text-muted-foreground truncate text-xs">
					{doc.originalFilename}
				</span>
				{doc.url ? (
					<a
						href={doc.url}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-1 text-xs font-medium underline underline-offset-4"
					>
						{isImage || isPdf ? 'View full size' : 'Download'}
					</a>
				) : null}
			</div>
		</div>
	);
}

/**
 * User-facing submission detail page (Server Component).
 *
 * Data-fetching strategy: fetches submission detail by ID server-side.
 * Returns 404 on failure. No caching — status changes during review cycle.
 *
 * Shows the form data and documents the user submitted,
 * along with status, dates, and rejection reason if applicable.
 *
 * @returns Detail page with submission data cards
 */
export default async function SubmissionDetailPage({
	params,
}: SubmissionDetailPageProps) {
	const { id } = await params;

	// requireAuth() short-circuits via redirect() before the authenticated
	// submission fetch fires — saves a backend round-trip for expired sessions
	// and keeps the cookie read (cache()-deduped) off the critical path for
	// authenticated users.
	await requireAuth();
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
				{detail.rejectionReason ? (
					<div className="mt-4 rounded-lg bg-red-50 p-4">
						<p className="text-sm font-medium text-red-700">Rejection Reason</p>
						<p className="mt-1 text-sm text-red-600">
							{detail.rejectionReason}
						</p>
					</div>
				) : null}
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
			{detail.documents.length > 0 ? (
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
			) : null}
		</div>
	);
}
