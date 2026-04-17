import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { CreditHistoryTable } from '@/components/profile/credits-table';
import { parsePositivePageParam } from '@/lib/pagination/parse-positive-page-param';
import { getCreditHistory } from '@/services/payment/get-credit-history';

/**
 * Props for CreditsPage
 */
interface CreditsPageProps {
	searchParams: Promise<{
		page?: string;
	}>;
}

/**
 * CreditsPage Component
 *
 * Displays full paginated list of credit ledger entries (newest first).
 * Mirrors the /profile/orders page pattern.
 */
export default async function CreditsPage({ searchParams }: CreditsPageProps) {
	const params = await searchParams;
	const page = parsePositivePageParam(params.page);
	const limit = 10;

	const result = await getCreditHistory({ page, limit });

	const entries = result.success ? result.data.entries : [];
	const totalPages = result.success ? result.data.totalPages : 0;
	const currentPage = result.success ? result.data.page : 1;

	/**
	 * Generates page URL with page parameter
	 */
	function getPageUrl(pageNum: number): string {
		return `/profile/credits?page=${pageNum}`;
	}

	return (
		<div className="flex flex-col gap-6 px-4">
			<div className="flex items-center gap-4">
				<Link href="/profile" className="flex w-fit items-center gap-2">
					<ArrowLeft className="size-4" />
					<span className="font-semibold">Back to Profile</span>
				</Link>
			</div>

			<div className="rounded-2xl bg-white p-8">
				<h1 className="mb-6 text-xl font-semibold">Credit History</h1>

				<CreditHistoryTable entries={entries} />

				{/* Pagination */}
				{totalPages > 1 ? (
					<div className="mt-6 flex items-center justify-center gap-2">
						{currentPage > 1 ? (
							<Link
								href={getPageUrl(currentPage - 1)}
								className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
							>
								Previous
							</Link>
						) : null}
						<span className="text-muted-foreground px-3 text-sm">
							Page {currentPage} of {totalPages}
						</span>
						{currentPage < totalPages ? (
							<Link
								href={getPageUrl(currentPage + 1)}
								className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
							>
								Next
							</Link>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
