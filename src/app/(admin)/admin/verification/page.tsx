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
 * Keyed on a single primitive string — React.cache compares arguments
 * with `Object.is`, so two object literals with matching fields would
 * miss the cache. Collapsing all filters into one string avoids that
 * and keeps the signature inside the 3-param limit (code-style.md).
 */
const getCachedSubmissions = cache(async function fetchAdminSubmissions(
	cacheKey: string,
) {
	const query = JSON.parse(cacheKey) as {
		page: number;
		limit: number;
		status: AdminKycQuery['status'];
		type: AdminKycQuery['type'];
	};
	return getAdminSubmissions(query);
});

/**
 * Serializes the fetch-driving params into a stable Suspense + cache key.
 *
 * Under Next 16 `cacheComponents: true`, React `<Activity>` preserves
 * prior route renders across same-pathname navigations. Without a key
 * change, the data subtree would keep its stale render when filters or
 * page change. A fresh key forces React to remount the Suspense child,
 * triggering a new server fetch for the current URL. The same key is
 * the cache argument for `getCachedSubmissions`, so Count + Data share
 * a single backend hit per render.
 */
function buildDataKey(query: AdminKycQuery): string {
	return JSON.stringify({
		page: query.page ?? DEFAULT_PAGE,
		limit: query.limit ?? DEFAULT_LIMIT,
		status: query.status ?? 'all',
		type: query.type ?? 'all',
	});
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
					<SubmissionsCount cacheKey={dataKey} />
				</Suspense>
			</div>

			<div className="rounded-2xl bg-white p-6">
				<Suspense
					key={`data-${dataKey}`}
					fallback={<SubmissionsSectionSkeleton />}
				>
					<SubmissionsData cacheKey={dataKey} />
				</Suspense>
			</div>
		</div>
	);
}

interface SubmissionsSectionProps {
	cacheKey: string;
}

/**
 * Async server component that renders the total-count label.
 * Shares fetched data with SubmissionsData via the React.cache wrapper.
 */
async function SubmissionsCount({ cacheKey }: SubmissionsSectionProps) {
	const result = await getCachedSubmissions(cacheKey);
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
async function SubmissionsData({ cacheKey }: SubmissionsSectionProps) {
	const result = await getCachedSubmissions(cacheKey);
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
