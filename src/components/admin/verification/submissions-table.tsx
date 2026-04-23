import Link from 'next/link';

import { KycStatusBadge } from '@/components/verification/badges/kyc-status-badge';
import { formatDate } from '@/lib/utils/format/date-format';
import type { AdminKycSubmission } from '@/types/admin-kyc';
import { VERIFICATION_TYPE } from '@/types/kyc-submission';

interface SubmissionsTableProps {
	submissions: AdminKycSubmission[];
}

/**
 * Maps verification type to a short label for table columns.
 * Intentionally shorter than getVerificationTypeLabel() — table cells
 * need compact text ("Individual" vs "Individual Host").
 */
function getTypeLabel(type: string): string {
	switch (type) {
		case VERIFICATION_TYPE.KYB_INDIVIDUAL:
			return 'Individual';
		case VERIFICATION_TYPE.KYB_COMPANY:
			return 'Company';
		case VERIFICATION_TYPE.KYC_WINNER:
			return 'Winner';
		default:
			return type;
	}
}

/**
 * SubmissionsTable Component
 *
 * Renders KYC submissions in a responsive table (desktop) + card stack (mobile).
 * Follows the established table pattern from PromoCodesTable.
 *
 * @returns Table with submission rows or empty state message
 */
export function SubmissionsTable({ submissions }: SubmissionsTableProps) {
	if (submissions.length === 0) {
		return (
			<p className="text-muted-foreground py-8 text-center text-sm">
				No submissions found.
			</p>
		);
	}

	return (
		<>
			{/* Desktop Table */}
			<div className="hidden overflow-x-auto md:block">
				<table className="w-full min-w-150">
					<thead>
						<tr className="text-muted-foreground border-border border-b text-left text-sm">
							<th className="pb-3 font-medium">Name</th>
							<th className="pb-3 font-medium">Email</th>
							<th className="pb-3 font-medium">Type</th>
							<th className="pb-3 font-medium">Status</th>
							<th className="pb-3 font-medium">Submitted</th>
							<th className="pb-3 text-right font-medium" />
						</tr>
					</thead>
					<tbody>
						{submissions.map(function renderRow(submission) {
							return (
								<tr
									key={submission.id}
									className="border-border border-t border-b"
								>
									<td className="py-4 font-medium">{submission.name ?? '—'}</td>
									<td className="py-4 text-sm">{submission.email ?? '—'}</td>
									<td className="py-4 text-sm">
										{getTypeLabel(submission.type)}
									</td>
									<td className="py-4">
										<KycStatusBadge status={submission.status} />
									</td>
									<td className="py-4 text-sm">
										{formatDate(submission.submittedAt)}
									</td>
									<td className="py-4 text-right">
										<Link
											href={`/admin/verification/${submission.id}`}
											className="text-sm font-medium underline underline-offset-4"
										>
											View
										</Link>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Mobile Cards */}
			<div className="flex flex-col gap-3 md:hidden">
				{submissions.map(function renderCard(submission) {
					return (
						<Link
							key={submission.id}
							href={`/admin/verification/${submission.id}`}
							className="border-border block rounded-lg border bg-white p-4"
						>
							<div className="flex items-start justify-between">
								<div>
									<p className="font-medium">{submission.name ?? '—'}</p>
									<p className="text-muted-foreground text-sm">
										{submission.email ?? '—'}
									</p>
								</div>
								<KycStatusBadge status={submission.status} />
							</div>

							<div className="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
								<span>{getTypeLabel(submission.type)}</span>
								<span>•</span>
								<span>{formatDate(submission.submittedAt)}</span>
							</div>
						</Link>
					);
				})}
			</div>
		</>
	);
}
