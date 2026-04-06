import { getAdminSubmissions } from '@/services/admin-kyc/get-submissions';
import { adminKycQuerySchema } from '@/types/admin-kyc';

import { SubmissionsFilters } from './submissions-filters';
import { SubmissionsPagination } from './submissions-pagination';
import { SubmissionsTable } from './submissions-table';

interface VerificationListPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Admin Verification List Page
 *
 * Paginated list of KYC submissions with status/type filters.
 * Server component — reads search params and fetches data server-side.
 *
 * @returns Page with heading, filters, table, and pagination
 */
export default async function VerificationListPage({
	searchParams,
}: VerificationListPageProps) {
	const params = await searchParams;

	// Validate and coerce search params — invalid values are silently ignored
	const queryResult = adminKycQuerySchema.safeParse({
		page: params.page,
		limit: params.limit,
		status: params.status,
		type: params.type,
	});
	const query = queryResult.success ? queryResult.data : {};

	// Encore requires page/limit in the query string — Rust parser validates before Zod defaults apply
	const result = await getAdminSubmissions({
		page: query.page ?? 1,
		limit: query.limit ?? 20,
		status: query.status,
		type: query.type,
	});
	const submissions = result.success ? result.data.submissions : [];
	const total = result.success ? result.data.total : 0;

	return (
		<div className="flex flex-col gap-6">
			<h1 className="font-clash-display text-3xl font-semibold text-black">
				KYC Reviews
			</h1>

			{/* Filters + total count */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<SubmissionsFilters />
				<p className="text-muted-foreground text-sm">
					{total} submission{total !== 1 ? 's' : ''}
				</p>
			</div>

			{/* Submissions table */}
			<div className="rounded-2xl bg-white p-6">
				<SubmissionsTable submissions={submissions} />
				<SubmissionsPagination total={total} />
			</div>
		</div>
	);
}
