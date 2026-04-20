import { cache, Suspense } from 'react';

import { SubmissionsFilters } from '@/components/admin/verification/submissions-filters';
import { SubmissionsPagination } from '@/components/admin/verification/submissions-pagination';
import { SubmissionsTable } from '@/components/admin/verification/submissions-table';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminSubmissions } from '@/services/admin-kyc/get-submissions';
import type { AdminKycQuery } from '@/types/admin-kyc';
import { adminKycQuerySchema } from '@/types/admin-kyc';

interface VerificationListPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Default page number when the search param is missing or invalid. */
const DEFAULT_PAGE = 1;
/** Default page size — matches the backend pagination contract. */
const DEFAULT_LIMIT = 20;

/**
 * Cached wrapper around getAdminSubmissions.
 *
 * Dedupes within a single React request tree so both `SubmissionsCount`
 * and `SubmissionsData` can call it without hitting the backend twice.
 * Keyed on primitives to guarantee argument equality across call sites —
 * React.cache uses reference equality for objects, which would defeat
 * deduplication if we passed inline `{ ... }` literals.
 */
const getCachedSubmissions = cache(async function fetchAdminSubmissions(
	page: number,
	limit: number,
	status: AdminKycQuery['status'],
	type: AdminKycQuery['type'],
) {
	return getAdminSubmissions({ page, limit, status, type });
});

/**
 * Serializes the fetch-driving params into a stable Suspense key.
 *
 * Under Next 16 `cacheComponents: true`, React `<Activity>` preserves
 * prior route renders across same-pathname navigations. Without a key
 * change, the data subtree would keep its stale render when filters or
 * page change. A fresh key forces React to remount the Suspense child,
 * triggering a new server fetch for the current URL.
 */
function buildDataKey(query: AdminKycQuery): string {
	const page = query.page ?? DEFAULT_PAGE;
	const limit = query.limit ?? DEFAULT_LIMIT;
	const status = query.status ?? 'all';
	const type = query.type ?? 'all';
	return `p${page}-l${limit}-s${status}-t${type}`;
}

/**
 * Admin Verification List Page (Server Component)
 *
 * Parses search params with Zod, then hands the parsed query to two
 * Suspense-wrapped async children keyed by the serialized params —
 * remount on any filter/page change guarantees a fresh server fetch
 * under cacheComponents. Filters live outside Suspense so the dropdowns
 * don't flash back to a fallback while data reloads.
 *
 * @returns Page with heading, filters, total counter, table, pagination
 */
export default async function VerificationListPage({
	searchParams,
}: VerificationListPageProps) {
	const params = await searchParams;

	// Invalid param values are silently ignored — Zod strips unknowns
	const queryResult = adminKycQuerySchema.safeParse({
		page: params.page,
		limit: params.limit,
		status: params.status,
		type: params.type,
	});
	const query = queryResult.success ? queryResult.data : {};

	const dataKey = buildDataKey(query);

	return (
		<div className="flex flex-col gap-6">
			<h1 className="font-clash-display text-3xl font-semibold text-black">
				KYC Reviews
			</h1>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<SubmissionsFilters />
				<Suspense
					key={`count-${dataKey}`}
					fallback={<Skeleton className="h-5 w-28" />}
				>
					<SubmissionsCount query={query} />
				</Suspense>
			</div>

			<div className="rounded-2xl bg-white p-6">
				<Suspense
					key={`data-${dataKey}`}
					fallback={<SubmissionsSectionSkeleton />}
				>
					<SubmissionsData query={query} />
				</Suspense>
			</div>
		</div>
	);
}

interface SubmissionsSectionProps {
	query: AdminKycQuery;
}

/**
 * Async server component that renders the total-count label.
 * Shares fetched data with SubmissionsData via the React.cache wrapper.
 */
async function SubmissionsCount({ query }: SubmissionsSectionProps) {
	const result = await getCachedSubmissions(
		query.page ?? DEFAULT_PAGE,
		query.limit ?? DEFAULT_LIMIT,
		query.status,
		query.type,
	);
	const total = result.success ? result.data.total : 0;

	return (
		<p className="text-muted-foreground text-sm">
			{total} submission{total !== 1 ? 's' : ''}
		</p>
	);
}

/**
 * Async server component that renders the table and pagination.
 * Shares fetched data with SubmissionsCount via the React.cache wrapper.
 */
async function SubmissionsData({ query }: SubmissionsSectionProps) {
	const result = await getCachedSubmissions(
		query.page ?? DEFAULT_PAGE,
		query.limit ?? DEFAULT_LIMIT,
		query.status,
		query.type,
	);
	const submissions = result.success ? result.data.submissions : [];
	const total = result.success ? result.data.total : 0;

	return (
		<>
			<SubmissionsTable submissions={submissions} />
			<SubmissionsPagination total={total} />
		</>
	);
}

/**
 * Skeleton matching the submissions table + pagination block.
 * Fixed five rows approximates the common case without layout shift.
 */
function SubmissionsSectionSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			{Array.from({ length: 5 }).map(function renderRow(_, index) {
				return <Skeleton key={index} className="h-12 w-full" />;
			})}
		</div>
	);
}
