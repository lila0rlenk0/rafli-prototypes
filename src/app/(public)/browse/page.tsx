import {
	parsePage,
	parseRaffleSortOption,
} from '@/app/(protected)/lib/parse-search-params';
import { BugIcon } from '@/assets/icons/bug-icon';
import { FilterBar } from '@/components/filters';
import {
	PublicRaffleCard,
	type RaffleRole,
} from '@/components/raffle/public-raffle-card';
import { getSession } from '@/lib/auth/session';
import { getCategories } from '@/services/raffle/get-categories';
import { getEnrolledRaffles } from '@/services/raffle/get-enrolled-raffles';
import { getRaffles } from '@/services/raffle/get-raffles';
import type { Raffle } from '@/types/raffle';
import Link from 'next/link';
import { Suspense } from 'react';

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

	// Fetch raffles, categories, and session in parallel
	const [response, categoriesResponse, session] = await Promise.all([
		getRaffles({
			status: 'live',
			page,
			category,
			sort,
			limit: 12,
		}),
		getCategories(),
		getSession(),
	]);

	// Fetch enrolled raffles for authenticated users
	const enrolledIds = new Set<string>();
	if (session) {
		const enrolledResponse = await getEnrolledRaffles({
			status: 'live',
			limit: 100,
		});
		if (enrolledResponse.success) {
			for (const r of enrolledResponse.data.raffles) {
				enrolledIds.add(r.id);
			}
		}
	}

	/**
	 * Determines user's role for a raffle
	 * @param raffle - The raffle to check
	 * @returns Role or undefined for non-authenticated users
	 */
	function getRaffleRole(raffle: Raffle): RaffleRole | undefined {
		if (!session) return undefined;
		if (raffle.hostId === session.user.id) return 'host';
		if (enrolledIds.has(raffle.id)) return 'participant';
		return undefined;
	}

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
				<h1 className="font-clash-display mb-4 text-4xl leading-8 font-semibold sm:text-5xl">
					Pick the prize you actually want
				</h1>
				<p className="text-lg font-medium">
					Get in, make a few clicks, and you&apos;re in the draw.
				</p>
			</div>

			{/* Filter Bar */}
			<div className="mb-8 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="font-clash-display text-3xl font-semibold">
					Browse all active raffles
				</h2>
				<Suspense fallback={null}>
					<FilterBar categories={categories} />
				</Suspense>
			</div>

			{/* Grid Section */}
			{raffles && raffles.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{raffles.map(raffle => (
						<PublicRaffleCard
							key={raffle.id}
							raffle={raffle}
							role={getRaffleRole(raffle)}
						/>
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
