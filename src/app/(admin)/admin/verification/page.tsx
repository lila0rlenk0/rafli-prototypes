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
 * miss the cache.
 */
const getCachedSubmissions = cache(async function fetchAdminSubmissions(
	cacheKey: string,
) {
	return getAdminSubmissions(JSON.parse(cacheKey) as AdminKycQuery);
});

/**
 * Awaits the searchParams Promise and serialises the parsed query into
 * a stable cache key. Undefined fields are dropped by `JSON.stringify`
 * — backend status/type schemas are strict enums and reject sentinel
 * values, so omission is the correct wire shape when no filter is set.
 */
async function buildCacheKey(
	searchParamsPromise: VerificationListPageProps['searchParams'],
): Promise<string> {
	const params = await searchParamsPromise;
	const queryResult = adminKycQuerySchema.safeParse({
		page: params.page,
		limit: params.limit,
		status: params.status,
		type: params.type,
	});
	const query = queryResult.success ? queryResult.data : {};
	return JSON.stringify({
		page: query.page ?? DEFAULT_PAGE,
		limit: query.limit ?? DEFAULT_LIMIT,
		status: query.status,
		type: query.type,
	});
}

/**
 * Admin Verification List Page (Server Component)
 *
 * The searchParams Promise is forwarded into Suspense-wrapped async
 * children rather than awaited at the page root. Under Next 16
 * `cacheComponents: true` the page segment's state key strips search
 * params (see `layout-router.js`), so an outer-level `await searchParams`
 * leaves the page shell — including any computed Suspense key — eligible
 * for Activity reuse across filter/page navigations, freezing the table
 * on stale rows. Reading searchParams inside a Suspense child is the
 * prescribed cacheComponents pattern and guarantees a fresh server fetch
 * for every URL. Filters stay outside Suspense so the dropdowns don't
 * flash back to a fallback while data reloads.
 *
 * @returns Page with heading, filters, total counter, table, pagination
 */
export default function VerificationListPage({
	searchParams,
}: VerificationListPageProps) {
	return (
		<div className="flex flex-col gap-6">
			<h1 className="font-clash-display text-3xl font-semibold text-black">
				KYC Reviews
			</h1>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<SubmissionsFilters />
				<Suspense fallback={<Skeleton className="h-5 w-28" />}>
					<SubmissionsCount searchParamsPromise={searchParams} />
				</Suspense>
			</div>

			<div className="rounded-2xl bg-white p-6">
				<Suspense fallback={<SubmissionsSectionSkeleton />}>
					<SubmissionsData searchParamsPromise={searchParams} />
				</Suspense>
			</div>
		</div>
	);
}

interface SubmissionsSectionProps {
	searchParamsPromise: VerificationListPageProps['searchParams'];
}

/**
 * Async server component that renders the total-count label.
 * Shares fetched data with SubmissionsData via the React.cache wrapper.
 */
async function SubmissionsCount({
	searchParamsPromise,
}: SubmissionsSectionProps) {
	const cacheKey = await buildCacheKey(searchParamsPromise);
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
async function SubmissionsData({
	searchParamsPromise,
}: SubmissionsSectionProps) {
	const cacheKey = await buildCacheKey(searchParamsPromise);
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
