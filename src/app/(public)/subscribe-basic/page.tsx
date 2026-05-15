import { MarqueeBanner } from '@/components/browse/marquee-banner';
import { Footer } from '@/components/landing/footer';
import { BenefitsSection } from '@/components/subscribe/benefits-section';
import { CtaSection } from '@/components/subscribe/cta-section';
import { HeroSection } from '@/components/subscribe/hero-section';
import { SubscribeNavbar } from '@/components/subscribe/navbar';
import {
	SUBSCRIBE_PLAN_SLUGS,
	SUBSCRIBE_PLANS,
} from '@/components/subscribe/plans';
import { prioritizeSubscribeRaffles } from '@/components/subscribe/prize-priority';
import { PrizeSection } from '@/components/subscribe/prize-section';
import { UrgencyCountdown } from '@/components/subscribe/urgency-countdown';
import { getRaffles } from '@/services/raffle/get-raffles';
import { RAFFLE_SORT_OPTION, RAFFLE_STATUS } from '@/types/raffle';

// Four cards fill the `lg:grid-cols-4` prize row exactly — any more
// leaves dangling cards on smaller breakpoints, any fewer leaves
// empty tracks on desktop.
const PRIZE_SHOWCASE_LIMIT = 4;

// Sky-blue marquee sits beneath the minimal navbar. Copy is the
// three-beat trust pitch from the Figma source — short, punchy,
// repeats cleanly across the `animate-marquee` seam. The bullet
// separator is rendered inside `MarqueeBanner` between repetitions.
const SUBSCRIBE_MARQUEE_MESSAGE =
	'Real prizes. Verified draws. Enter in seconds.';

// Pin the Basic plan at the route level. Each landing page targets one
// tier — the page composition is identical across `/subscribe-basic`,
// `/subscribe-starter`, and `/subscribe-pro`, so the only branch a route
// owns is which `SubscribePlan` it reads from `SUBSCRIBE_PLANS`. Keeping
// the constant at module scope avoids re-reading the config on every
// render and surfaces the plan binding in the file header.
const BASIC_PLAN = SUBSCRIBE_PLANS[SUBSCRIBE_PLAN_SLUGS.BASIC];

/**
 * `/subscribe-basic` — Basic Access Pass marketing landing
 * ($10 → $11, 10% OFF, 10 tickets).
 *
 * Async Server Component. The page is the only fetch site (architecture.md:
 * "pages fetch, domain components render"): it pulls the LIVE prize
 * showcase, applies the marketing priority order, and renders the navbar +
 * marquee + 5 content sections + footer. Plan-aware sections (hero,
 * benefits, urgency caption, prize caption, CTA, credit-purchase card)
 * receive `BASIC_PLAN` so the funnel posts the `basic_access_pass` slug
 * to `/payments/fanbasis/public-subscription-checkout`.
 *
 * Session reading is unnecessary here: the page's single CTA mints a
 * Fanbasis hosted-redirect session via `credit-purchase-card.tsx` and
 * full-page-navigates the buyer to the upstream payment page — same flow
 * for anonymous and returning visitors alike. Email + card are collected
 * on Fanbasis's hosted page after the redirect, so there is no
 * pre-redirect payload for the FE to validate or branch on.
 *
 * Prize fetch failures collapse the prize section (handled inside
 * `PrizeSection`) rather than 500 the whole marketing landing.
 *
 * @returns Marketing landing for the Basic tier
 */
export default async function SubscribeBasicPage() {
	const rafflesResponse = await getRaffles({
		status: RAFFLE_STATUS.LIVE,
		limit: PRIZE_SHOWCASE_LIMIT,
		sort: RAFFLE_SORT_OPTION.TRENDING,
	});

	const raffles = rafflesResponse.success
		? prioritizeSubscribeRaffles(rafflesResponse.data.raffles)
		: [];

	return (
		<>
			<SubscribeNavbar
				topBanner={
					<MarqueeBanner
						message={SUBSCRIBE_MARQUEE_MESSAGE}
						bgClassName="bg-brand-sky"
					/>
				}
			>
				<HeroSection plan={BASIC_PLAN} />
				<UrgencyCountdown payoutUsd={BASIC_PLAN.payoutUsd} />
				<BenefitsSection plan={BASIC_PLAN} />
				<PrizeSection
					raffles={raffles}
					ticketsPerCycle={BASIC_PLAN.ticketsPerCycle}
				/>
				<CtaSection plan={BASIC_PLAN} />
			</SubscribeNavbar>
			<Footer />
		</>
	);
}
