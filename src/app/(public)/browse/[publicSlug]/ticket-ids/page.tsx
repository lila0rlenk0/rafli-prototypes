import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/ui/back-link';
import { getSession } from '@/lib/auth/session';
import { getRaffle } from '@/services/raffle/get-raffle';
import { getMyTicketCodes } from '@/services/ticket/get-my-ticket-codes';

import { TicketCodesTable } from './ticket-codes-table';

/**
 * Props for TicketIdsPage
 */
interface TicketIdsPageProps {
	params: Promise<{
		publicSlug: string;
	}>;
	searchParams: Promise<{
		page?: string;
	}>;
}

/**
 * Dedicated page for viewing all ticket codes for a raffle.
 * Displays a paginated table of ticket codes with dates.
 *
 * @returns Paginated ticket codes table or not found page
 */
export default async function TicketIdsPage({
	params,
	searchParams,
}: TicketIdsPageProps) {
	const { publicSlug } = await params;
	const queryParams = await searchParams;
	const page = queryParams.page ? parseInt(queryParams.page, 10) : 1;
	const limit = 20;

	const session = await getSession();

	if (!session) {
		notFound();
	}

	const response = await getRaffle(publicSlug);

	if (!response.success) {
		notFound();
	}

	const raffle = response.data;

	const ticketCodesResponse = await getMyTicketCodes({
		raffleId: raffle.id,
		page,
		limit,
	});

	const ticketCodes = ticketCodesResponse.success
		? ticketCodesResponse.data.tickets
		: [];
	const totalPages = ticketCodesResponse.success
		? ticketCodesResponse.data.totalPages
		: 0;
	const currentPage = ticketCodesResponse.success
		? ticketCodesResponse.data.page
		: 1;

	/**
	 * Generates page URL with page parameter
	 */
	function getPageUrl(pageNum: number): string {
		return `/browse/${publicSlug}/ticket-ids?page=${pageNum}`;
	}

	return (
		<div className="container mx-auto flex max-w-4xl flex-col gap-6 px-4">
			<BackLink fallbackHref={`/browse/${publicSlug}`} label="Back to Raffle" />

			<div className="rounded-2xl bg-white p-8">
				<h1 className="mb-6 text-xl font-semibold">
					My Tickets — {raffle.title}
				</h1>

				<TicketCodesTable ticketCodes={ticketCodes} />

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
