import { RaffleCard } from '@/app/(protected)/my-raffles/raffle-card';
import {
	parsePage,
	parseRaffleSortOption,
	parseRaffleStatus,
} from '@/app/(protected)/lib/parse-search-params';
import { FilterBar } from '@/components/filters';
import { getRaffles } from '@/services/raffle/get-raffles';

interface PageProps {
	searchParams: Promise<{
		status?: string;
		page?: string;
		category?: string;
		sort?: string;
	}>;
}

/**
 * Browse Raffles Page
 *
 * Public-facing page displaying all available raffles with filtering and sorting.
 * Supports URL-based filtering by status, category, sort order, and pagination.
 */
export default async function BrowseRafflesPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const status = parseRaffleStatus(params.status);
	const sort = parseRaffleSortOption(params.sort);
	const page = parsePage(params.page);
	const category = params.category;

	const response = await getRaffles({
		status,
		page,
		category,
		sort,
		limit: 12,
	});

	if (!response.success) {
		return (
			<div className="flex h-[50vh] w-full items-center justify-center">
				<div className="text-center">
					<h3 className="text-lg font-medium text-red-600">
						Error loading raffles
					</h3>
					<p className="mt-2 text-gray-500">Failed to load raffles</p>
				</div>
			</div>
		);
	}

	const { raffles } = response.data;

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			{/* Header Section */}
			<div className="mb-12 text-center">
				<h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
					Browse Raffles
				</h1>
				<p className="text-muted-foreground text-lg">
					Discover amazing raffles and win big!
				</p>
			</div>

			{/* Filter Bar */}
			<div className="mb-8 flex w-full">
				<div className="ml-auto">
					<FilterBar />
				</div>
			</div>

			{/* Grid Section */}
			{raffles && raffles.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{raffles.map(raffle => (
						<RaffleCard key={raffle.id} raffle={raffle} />
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<h3 className="text-xl font-semibold text-gray-900">
						No raffles found
					</h3>
					<p className="mt-2 text-gray-500">
						Check back later for new opportunities to win!
					</p>
				</div>
			)}
		</div>
	);
}
