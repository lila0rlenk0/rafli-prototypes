import { Suspense } from 'react';

import { HeroDecorTopRight } from '@/assets/hero-decor-top-right';
import { FeaturedRaffleCard } from '@/components/browse/featured-raffle-card';
import { MarqueeBanner } from '@/components/browse/marquee-banner';
import { PastDrawsSection } from '@/components/browse/past-draws-section';
import { RecentWinnersSection } from '@/components/browse/recent-winners-section';
import { CTASection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingNavbar } from '@/components/landing/landing-navbar';
import { LiveRafflesSection } from '@/components/landing/live-raffles-section';
import { SocialProofFaqSection } from '@/components/landing/social-proof-faq-section';
import { PublicRaffleCard } from '@/components/raffle/cards/public-card';
import { Separator } from '@/components/ui/separator';
import { getFeaturedRaffles } from '@/services/raffle/get-featured-raffles';
import { getRaffles } from '@/services/raffle/get-raffles';
import { getRecentWinners } from '@/services/winning/get-recent-winners';
import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';

// Top-fold raffle band cap. Matches /browse's first page-size, which lets a
// repeat visitor recognise the grid layout immediately when they tap through.
const LIVE_RAFFLES_LIMIT = 8;

// Past-draws strip cap. Same volume the browse page streams below the fold so
// the carousel page count and snap rhythm read consistently across surfaces.
const PAST_DRAWS_LIMIT = 12;

// Backend read timeout is 20s; the 30s page budget matches /browse so the
// upstream timeout ladder stays consistent — the route returns its degraded
// state instead of hanging Vercel's long default for stalled invocations.
export const maxDuration = 30;

/**
 * Featured-raffle band — two-up at lg, stacked below. Matches /browse so the
 * blue/green pair reads as the same band on both surfaces. Returns null when
 * the backend has no featured raffles so the layout collapses cleanly instead
 * of leaving an empty row.
 *
 * @param featuredRaffles - Featured raffle list from `getFeaturedRaffles`
 * @returns Two-up featured band, or null when there are no featured raffles
 */
function renderFeaturedBand(featuredRaffles: readonly Raffle[]) {
	if (featuredRaffles.length === 0) return null;
	return (
		<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-8">
			{featuredRaffles.slice(0, 2).map((raffle, i) => (
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
 * Streamed recent-winners strip. Wrapped in `<Suspense>` by the page so a
 * slow `getRecentWinners()` cannot delay first paint of the hero above.
 * Same defensive shape /browse uses — returns null on empty / failed
 * responses since winners are decorative social proof, not essential page
 * content.
 *
 * @returns Recent winners carousel, or null when there are no winners
 */
async function RecentWinnersAsync() {
	const response = await getRecentWinners();
	const winners = response.success ? response.data.winners : [];

	if (winners.length === 0) return null;

	return <RecentWinnersSection winners={winners} />;
}

/**
 * Streamed past-draws carousel. Pulls the COMPLETED raffles page separately
 * from the LIVE list that drives the grid so the two requests fan out in
 * parallel instead of sharing a serial await chain.
 *
 * @returns Past draws carousel, or null when there are no completed raffles
 */
async function PastDrawsAsync() {
	const response = await getRaffles({
		status: RAFFLE_STATUS.COMPLETED,
		limit: PAST_DRAWS_LIMIT,
		sort: 'newest',
	});

	const pastDraws = response.success ? response.data.raffles : [];

	if (pastDraws.length === 0) return null;

	return <PastDrawsSection raffles={pastDraws} />;
}

/**
 * Landing page for Rafli.
 *
 * Async Server Component. Reuses the /browse data services + cards
 * (`FeaturedRaffleCard`, `PublicRaffleCard`, `RecentWinnersSection`,
 * `PastDrawsSection`) so the marketing surface ships live sweepstakes /
 * winners / past draws instead of static placeholders. The chrome stays
 * marketing-only (`LandingNavbar`) — auth-aware controls like the mode
 * toggle and notification bell live on /browse via `PublicNavbar` and
 * would clash with the guest-targeted hero copy here.
 *
 * Top-fold batch fetches the LIVE list and featured raffles in parallel so
 * the hero stats + featured band + grid paint together. Below-the-fold
 * winners and past draws stream via `<Suspense>` to keep FCP gated only on
 * the critical batch.
 *
 * Section order (mirrors the inspiration handoff):
 *   LandingNavbar > MarqueeBanner > LandingHero > RecentWinners (streamed) >
 *   Separator > FeaturedBand > LiveRafflesSection > HowItWorks >
 *   PastDraws (streamed) > SocialProofFAQ > CTA > Footer.
 *
 * @returns Full landing page with live data + marketing sections composed
 */
export default async function LandingPage() {
	const [liveResponse, featuredResponse] = await Promise.all([
		getRaffles({
			status: RAFFLE_STATUS.LIVE,
			limit: LIVE_RAFFLES_LIMIT,
			sort: 'newest',
		}),
		getFeaturedRaffles(),
	]);

	const liveRaffles = liveResponse.success ? liveResponse.data.raffles : [];
	const featuredRaffles = featuredResponse.success
		? featuredResponse.data.raffles
		: [];

	const totalPrizeValue = liveRaffles.reduce(
		(sum, raffle) => sum + Number(raffle.declaredValueAmount),
		0,
	);

	return (
		<div className="bg-background min-h-dvh">
			<LandingNavbar />
			<MarqueeBanner message="Share any sweepstakes on X and earn bonus entries!" />

			<div className="relative overflow-hidden">
				<HeroDecorTopRight className="pointer-events-none absolute top-0 right-0 w-(--spacing-landing-hero-decor) -scale-x-100" />
				<main className="max-w-hero relative mx-auto flex flex-col gap-10 px-4 py-10 sm:gap-16 sm:p-12">
					<LandingHero
						activeCount={liveRaffles.length}
						totalPrizeValue={totalPrizeValue}
					/>

					<Suspense fallback={null}>
						<RecentWinnersAsync />
					</Suspense>

					<Separator />

					{renderFeaturedBand(featuredRaffles)}

					{liveRaffles.length > 0 ? (
						<LiveRafflesSection>
							{liveRaffles.map(raffle => (
								<PublicRaffleCard key={raffle.id} raffle={raffle} />
							))}
						</LiveRafflesSection>
					) : null}
				</main>
			</div>

			<HowItWorksSection />

			<section className="max-w-hero mx-auto flex flex-col gap-10 px-4 py-10 sm:gap-16 sm:px-12 sm:py-16">
				<Suspense fallback={null}>
					<PastDrawsAsync />
				</Suspense>
			</section>

			<SocialProofFaqSection />
			<CTASection />
			<Footer />
		</div>
	);
}
