import {
	parsePage,
	parseRaffleSortOption,
} from '@/app/(protected)/lib/parse-search-params';
import { BugIcon } from '@/assets/icons/bug-icon';
import { BrowseTabs } from '@/components/browse/browse-tabs';
import { FeaturedRaffleCard } from '@/components/browse/featured-raffle-card';
import { HeroSection } from '@/components/browse/hero-section';
import { PastDrawsSection } from '@/components/browse/past-draws-section';
import { RecentWinnersSection } from '@/components/browse/recent-winners-section';
import { FilterBar, StickyFilterSection } from '@/components/filters';
import {
	PublicRaffleCard,
	type RaffleRole,
} from '@/components/raffle/public-raffle-card';
import { getSession } from '@/lib/auth/session';
import { getCategories } from '@/services/raffle/get-categories';
import { getEnrolledRaffles } from '@/services/raffle/get-enrolled-raffles';
import { getFeaturedRaffles } from '@/services/raffle/get-featured-raffles';
import { getRaffles } from '@/services/raffle/get-raffles';
import { getRecentWinners } from '@/services/winning/get-recent-winners';
import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';
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
 * Server Component — public-facing page displaying all available raffles.
 * Data-fetching: parallel Promise.all for raffles, featured, categories, and session.
 * Enrolled raffles fetched sequentially only when authenticated (depends on session).
 * No caching tags — uses default ISR via getRaffles/getCategories internal caching.
 *
 * Data flow: searchParams → parse sort/page/category → fetch grid data →
 * render hero stats + featured cards + filterable grid.
 */
export default async function BrowseRafflesPage({ searchParams }: PageProps) {
	// Step 1: Parse URL search params into typed filter values.
	const params = await searchParams;
	const sort = parseRaffleSortOption(params.sort);
	const page = parsePage(params.page);
	const category = params.category;

	// Step 2: Fetch primary data in parallel — no dependencies between these calls.
	// 12 items per page — matches the 4-column grid (3 rows visible above fold).
	// `getRecentWinners()` omits `limit` on purpose: backend default (currently 6,
	// 5-min Redis cache) is the editorial source of truth — never hardcode here.
	// `getRaffles({ status: completed })` mirrors the live grid's limit/sort so
	// the past section reads as a continuation of the same surface.
	const [
		response,
		featuredResponse,
		categoriesResponse,
		session,
		recentWinnersResponse,
		pastDrawsResponse,
	] = await Promise.all([
		getRaffles({
			status: RAFFLE_STATUS.LIVE,
			page,
			category,
			sort,
			limit: 12,
		}),
		getFeaturedRaffles(),
		getCategories(),
		getSession(),
		getRecentWinners(),
		getRaffles({
			status: RAFFLE_STATUS.COMPLETED,
			limit: 12,
			sort: 'newest',
		}),
	]);

	// Step 3: Fetch enrolled raffles only for authenticated users.
	// Sequential — depends on session result. Used to show "Participant" badge on cards.
	// limit: 100 — practical ceiling; users rarely enroll in more live raffles simultaneously.
	const enrolledIds = new Set<string>();
	if (session) {
		const enrolledResponse = await getEnrolledRaffles({
			status: RAFFLE_STATUS.LIVE,
			limit: 100,
		});
		if (enrolledResponse.success) {
			for (const r of enrolledResponse.data.raffles) {
				enrolledIds.add(r.id);
			}
		}
	}

	/**
	 * Determines user's role for a raffle — host, participant, or undefined (guest/unrelated).
	 * O(1) lookup via enrolledIds Set built in Step 3.
	 *
	 * @param raffle - The raffle to check role for
	 * @returns Role badge type or undefined for non-authenticated users
	 */
	function getRaffleRole(raffle: Raffle): RaffleRole | undefined {
		if (!session) return undefined;
		if (raffle.hostId === session.user.id) return 'host';
		if (enrolledIds.has(raffle.id)) return 'participant';
		return undefined;
	}

	// Step 4: Filter to active categories — inactive ones are admin-disabled.
	const categories = categoriesResponse.success
		? categoriesResponse.data.categories.filter(c => c.isActive)
		: [];

	// Step 5: Guard — early return on raffle fetch failure.
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

	// Step 6: Derive render data from successful responses.
	const { raffles } = response.data;

	// Admin-curated featured raffles from dedicated endpoint (0-2 items).
	// Grid uses the full /raffles response — featured cards are separate.
	const featuredRaffles = featuredResponse.success
		? featuredResponse.data.raffles
		: [];

	// Aggregate prize value for hero section stats display
	const totalPrizeValue = raffles.reduce(
		(sum, r) => sum + Number(r.declaredValueAmount),
		0,
	);

	// Optional sections — fail-silent. Recent winners and past draws are
	// editorial enrichment, not core to /browse's purpose, so a backend hiccup
	// here must NOT break the live raffles grid above. Empty arrays are also
	// treated as "no section" — we don't render an empty-state placeholder.
	const recentWinners = recentWinnersResponse.success
		? recentWinnersResponse.data.winners
		: [];
	const pastDraws = pastDrawsResponse.success
		? pastDrawsResponse.data.raffles
		: [];

	return (
		<div className="z-10 pt-0 pb-8 sm:py-8">
			{/* Hero Section */}
			<div className="mb-10 sm:mb-16">
				<HeroSection raffles={raffles} totalPrizeValue={totalPrizeValue} />
			</div>

			{/* Recent Winners — placed above the live grid as social proof:
			    visitors see "real people are winning" before scrolling the catalog.
			    Hidden entirely when the backend returns no winners (early-stage app,
			    cache miss + transient failure, etc.) — no empty placeholder needed. */}
			{recentWinners.length > 0 ? (
				<div className="mb-10 sm:mb-16">
					<RecentWinnersSection winners={recentWinners} />
				</div>
			) : null}

			<BrowseTabs
				featuredContent={
					featuredRaffles.length > 0 ? (
						<div className="mb-10 flex flex-col gap-6 sm:mb-16 lg:grid lg:grid-cols-2 lg:gap-8">
							{featuredRaffles.map((raffle, i) => (
								<FeaturedRaffleCard
									key={raffle.id}
									raffle={raffle}
									variant={i === 0 ? 'blue' : 'green'}
								/>
							))}
						</div>
					) : null
				}
				filtersContent={
					<StickyFilterSection>
						<Suspense fallback={null}>
							<FilterBar categories={categories} />
						</Suspense>
					</StickyFilterSection>
				}
				gridContent={
					raffles.length > 0 ? (
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
					)
				}
			/>

			{/* Past Draws — placed below the live grid so users only encounter
			    historical results after they've seen current opportunities.
			    Same fail-silent pattern as recent winners above. */}
			{pastDraws.length > 0 ? (
				<div className="mt-10 sm:mt-16">
					<PastDrawsSection raffles={pastDraws} />
				</div>
			) : null}
		</div>
	);
}
