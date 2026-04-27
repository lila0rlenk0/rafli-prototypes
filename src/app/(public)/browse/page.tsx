import {
	parsePage,
	parseRaffleSortOption,
} from '@/lib/utils/raffle/raffle-search-params';
import { BrowsePageError } from '@/components/browse/page-error';
import { BrowseTabs } from '@/components/browse/tabs';
import { FeaturedRaffleCard } from '@/components/browse/featured-raffle-card';
import { HeroSection } from '@/components/browse/hero-section';
import { MarqueeBanner } from '@/components/browse/marquee-banner';
import { PublicNavbar } from '@/components/ui-custom/public-navbar';
import { PastDrawsSection } from '@/components/browse/past-draws-section';
import { RecentWinnersSection } from '@/components/browse/recent-winners-section';
import { SubscribePromoCard } from '@/components/browse/subscribe-promo-card';
import { FilterBar, StickyFilterSection } from '@/components/filters';
import {
	PublicRaffleCard,
	type RaffleRole,
} from '@/components/raffle/cards/public-card';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { getSession } from '@/lib/auth/session';
import { getCategories } from '@/services/raffle/get-categories';
import { getFeaturedRaffles } from '@/services/raffle/get-featured-raffles';
import { getRaffles } from '@/services/raffle/get-raffles';
import { getRecentWinners } from '@/services/winning/get-recent-winners';
import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';
import { Suspense } from 'react';

import { loadAuthenticatedBrowseSummary } from './authenticated-browse-loader';

/** Each featured band mount builds its own tree so both slots (desktop + mobile) keep distinct RSC node identity. */
function renderFeaturedBand(featuredRaffles: Raffle[]) {
	if (featuredRaffles.length === 0) return null;
	return (
		<div className="mb-10 flex flex-col gap-6 sm:mb-16 lg:grid lg:grid-cols-2 lg:gap-8">
			{featuredRaffles.map((raffle, i) => (
				<FeaturedRaffleCard
					key={raffle.id}
					raffle={raffle}
					variant={i === 0 ? 'blue' : 'green'}
				/>
			))}
		</div>
	);
}

interface PageProps {
	searchParams: Promise<{
		status?: string;
		page?: string;
		category?: string;
		sort?: string;
	}>;
}

// Next segment config must be a statically analyzable literal. Keep this
// aligned with the API timeout ladder: 30s is above the 20s backend read
// timeout, but below Vercel's long default for hung invocations.
export const maxDuration = 30;

export default async function BrowseRafflesPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const sort = parseRaffleSortOption(params.sort);
	const page = parsePage(params.page);
	const category = params.category;

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

	const { enrolledIds, hasSubscription } = session
		? await loadAuthenticatedBrowseSummary()
		: { enrolledIds: new Set<string>(), hasSubscription: false };

	function getRaffleRole(raffle: Raffle): RaffleRole | undefined {
		if (!session) return undefined;
		if (raffle.hostId === session.user.id) return 'host';
		if (enrolledIds.has(raffle.id)) return 'participant';
		return undefined;
	}

	const categories = categoriesResponse.success
		? categoriesResponse.data.categories.filter(c => c.isActive)
		: [];

	if (!response.success) return <BrowsePageError />;

	const { raffles } = response.data;

	const featuredRaffles = featuredResponse.success
		? featuredResponse.data.raffles
		: [];

	const totalPrizeValue = raffles.reduce(
		(sum, r) => sum + Number(r.declaredValueAmount),
		0,
	);

	const recentWinners = recentWinnersResponse.success
		? recentWinnersResponse.data.winners
		: [];
	const pastDraws = pastDrawsResponse.success
		? pastDrawsResponse.data.raffles
		: [];

	return (
		<PublicNavbar
			isAuthenticated={!!session}
			topBanner={
				<MarqueeBanner message="Share any sweepstakes on X and earn bonus entries!" />
			}
		>
			<div className="z-10 pt-0 pb-8 sm:py-8">
				{FEATURE_FLAGS.SUBSCRIPTION_ENABLED ? (
					<>
						<div className="mb-8 lg:hidden">
							<SubscribePromoCard hasSubscription={hasSubscription} />
						</div>

						<div className="mb-10 grid items-start gap-6 sm:mb-16 lg:grid-cols-[minmax(0,1fr)_minmax(420px,460px)] lg:gap-10">
							<HeroSection
								raffles={raffles}
								totalPrizeValue={totalPrizeValue}
							/>
							<div className="hidden lg:block">
								<SubscribePromoCard hasSubscription={hasSubscription} />
							</div>
						</div>
					</>
				) : (
					<div className="mb-10 sm:mb-16">
						<HeroSection raffles={raffles} totalPrizeValue={totalPrizeValue} />
					</div>
				)}

				{recentWinners.length > 0 ? (
					<div className="mb-10 sm:mb-16">
						<RecentWinnersSection winners={recentWinners} />
					</div>
				) : null}

				<div className="hidden sm:block">
					{renderFeaturedBand(featuredRaffles)}
				</div>

				<BrowseTabs
					featuredMobile={renderFeaturedBand(featuredRaffles)}
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
									No sweepstakes found
								</h3>
								<p className="mt-2 text-gray-500">
									Check back later for new opportunities to win!
								</p>
							</div>
						)
					}
				/>

				{pastDraws.length > 0 ? (
					<div className="mt-10 sm:mt-16">
						<PastDrawsSection raffles={pastDraws} />
					</div>
				) : null}
			</div>
		</PublicNavbar>
	);
}
