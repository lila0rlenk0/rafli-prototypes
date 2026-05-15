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
import { PublicRaffleCard } from '@/components/raffle/cards/public-card';
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

/**
 * Empty-state copy when the active filters return zero raffles.
 *
 * @returns Centered "No sweepstakes found" block.
 */
function BrowseEmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-20 text-center">
			<h3 className="text-foreground text-xl font-semibold">
				No sweepstakes found
			</h3>
			<p className="text-muted-foreground mt-2">
				Check back later for new opportunities to win!
			</p>
		</div>
	);
}

/**
 * Streamed below-the-fold winners band. Wrapped in `<Suspense>` by the
 * page so a slow `getRecentWinners()` cannot delay first paint of the
 * hero / grid / featured / filters above.
 *
 * @returns Recent-winners section, or `null` when the API returns no
 *   winners (or fails — winners are decorative, no error UI needed).
 */
async function RecentWinnersAsync() {
	const recentWinnersResponse = await getRecentWinners();
	const recentWinners = recentWinnersResponse.success
		? recentWinnersResponse.data.winners
		: [];

	if (recentWinners.length === 0) return null;

	return (
		<div className="mb-10 sm:mb-16">
			<RecentWinnersSection winners={recentWinners} />
		</div>
	);
}

/**
 * Streamed below-the-fold past-draws band. Pulls the COMPLETED raffles
 * page on its own, independent from the LIVE list that drives the grid.
 *
 * @returns Past-draws section, or `null` when there are no completed
 *   raffles (or the fetch fails — non-essential surface).
 */
async function PastDrawsAsync() {
	const pastDrawsResponse = await getRaffles({
		status: RAFFLE_STATUS.COMPLETED,
		limit: 12,
		sort: 'newest',
	});

	const pastDraws = pastDrawsResponse.success
		? pastDrawsResponse.data.raffles
		: [];

	if (pastDraws.length === 0) return null;

	return (
		<div className="mt-10 sm:mt-16">
			<PastDrawsSection raffles={pastDraws} />
		</div>
	);
}

/**
 * Streamed subscribe-promo. Returns the bare card so it slots directly into
 * the hero grid's right rail — `SubscribePromoCard` itself owns the lg-only
 * `-mt-10 / rounded-t-none / border-t-0` classes that visually extend the
 * marquee banner downward, and `lg:max-w-none / lg:mx-0` that fill the
 * 420–460px sidebar column. Wrapping it would re-introduce a competing
 * width constraint and break the marquee continuation.
 *
 * @returns Subscribe promo card, or `null` when the viewer already has
 *   an active subscription.
 */
async function SubscribePromoAsync() {
	const session = await getSession();
	// Guests cannot have a subscription, so skip the auth round-trip.
	const hasSubscription = session
		? (await loadAuthenticatedBrowseSummary()).hasSubscription
		: false;
	if (hasSubscription) return null;

	return <SubscribePromoCard />;
}

/**
 * Hero rail composer. Promo-on layout is a 2-col grid on `lg:` (hero left,
 * streamed promo right rail at 420–460px); promo-off collapses to the hero
 * alone. On viewports below `lg:` the grid is single-column, stacking the
 * promo below the hero — the card's mobile classes (`max-w-card-sm mx-auto`)
 * keep it centered and width-capped there.
 *
 * The promo is wrapped in `<Suspense fallback={null}>` so the subscription
 * check can resolve after the hero paints. During the wait the right column
 * is empty; once the check completes the card fills in. Subscribers see the
 * grid with a permanently empty right column — acceptable since the promo
 * is feature-flagged and subscribers are a minority on the browse surface.
 */
function BrowseHeroRail({
	raffles,
	totalPrizeValue,
}: {
	raffles: Raffle[];
	totalPrizeValue: number;
}) {
	if (!FEATURE_FLAGS.SUBSCRIBE_PROMO_ENABLED) {
		return (
			<div className="mb-10 sm:mb-16">
				<HeroSection raffles={raffles} totalPrizeValue={totalPrizeValue} />
			</div>
		);
	}

	return (
		<div className="mb-10 grid items-start gap-6 sm:mb-16 lg:grid-cols-[minmax(0,1fr)_minmax(420px,460px)] lg:gap-10">
			<HeroSection raffles={raffles} totalPrizeValue={totalPrizeValue} />
			<Suspense fallback={null}>
				<SubscribePromoAsync />
			</Suspense>
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

	// Top-fold parallel batch — data needed to paint hero, grid, filters, and
	// featured band. Below-fold sections stream via `<Suspense>` so a slow
	// secondary API cannot gate FCP.
	const [response, featuredResponse, categoriesResponse, session] =
		await Promise.all([
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
		]);

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

	return (
		<PublicNavbar
			isAuthenticated={!!session}
			topBanner={
				<MarqueeBanner message="Share any sweepstakes on X and earn bonus entries!" />
			}
		>
			<div className="z-10 pt-0 pb-8 sm:py-8">
				<BrowseHeroRail raffles={raffles} totalPrizeValue={totalPrizeValue} />

				<Suspense fallback={null}>
					<RecentWinnersAsync />
				</Suspense>

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
									<PublicRaffleCard key={raffle.id} raffle={raffle} />
								))}
							</div>
						) : (
							<BrowseEmptyState />
						)
					}
				/>

				<Suspense fallback={null}>
					<PastDrawsAsync />
				</Suspense>
			</div>
		</PublicNavbar>
	);
}
