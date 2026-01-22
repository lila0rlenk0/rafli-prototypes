import {
	parsePage,
	parseRaffleSortOption,
} from '@/app/(protected)/lib/parse-search-params';
import { BugIcon } from '@/assets/icons/bug-icon';
import { FilterBar } from '@/components/filters';
import { PublicRaffleCard } from '@/components/raffle/public-raffle-card';
import { getCategories } from '@/services/raffle/get-categories';
import { getRaffles } from '@/services/raffle/get-raffles';
import Link from 'next/link';

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
	const sort = parseRaffleSortOption(params.sort);
	const page = parsePage(params.page);
	const category = params.category;

	// Fetch raffles and categories in parallel
	const [response, categoriesResponse] = await Promise.all([
		getRaffles({
			status: 'live',
			page,
			category,
			sort,
			limit: 12,
		}),
		getCategories(),
	]);

	// Filter active categories only
	const categories = categoriesResponse.success
		? categoriesResponse.data.categories.filter(c => c.isActive)
		: [];

	if (!response.success) {
		return (
			<div className="flex h-[50vh] w-full flex-col items-center justify-center gap-10 text-center">
				<BugIcon />

				<hgroup className="space-y-4">
					<h2 className="text-xl font-semibold">Error loading raffles</h2>
					<p className="mt-2 text-lg">
						Something went wrong while trying to load the raffles.
					</p>
				</hgroup>

				<Link
					href="/browse"
					className="rounded-full border border-black px-12 py-3 text-sm font-semibold text-black transition-colors"
				>
					Back to Browse
				</Link>
			</div>
		);
	}

	const { raffles } = response.data;

	return (
		<div className="z-10 container mx-auto px-4 py-8">
			{/* Header Section */}
			<div className="mb-20">
				<h1 className="font-clash-display mb-4 text-4xl leading-8 font-extrabold sm:text-5xl">
					Choose a prize you&apos;ve been wanting!
				</h1>
				<p className="text-lg font-medium">
					Get in, make a few clicks, and you&apos;re in the draw.
				</p>
			</div>

			{/* Filter Bar */}
			<div className="mb-8 flex w-full justify-between">
				<h2 className="font-clash-display text-3xl font-semibold">
					More existing raffles!
				</h2>
				<FilterBar categories={categories} />
			</div>

			{/* Grid Section */}
			{raffles && raffles.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{raffles.map(raffle => (
						<PublicRaffleCard key={raffle.id} raffle={raffle} />
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
