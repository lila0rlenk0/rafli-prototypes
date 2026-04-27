import { MarqueeBanner } from '@/components/browse/marquee-banner';
import { BenefitsSection } from '@/components/subscribe/benefits-section';
import { CtaSection } from '@/components/subscribe/cta-section';
import { HeroSection } from '@/components/subscribe/hero-section';
import { SubscribeNavbar } from '@/components/subscribe/navbar';
import { PrizeSection } from '@/components/subscribe/prize-section';
import { UrgencyCountdown } from '@/components/subscribe/urgency-countdown';
import { getRaffles } from '@/services/raffle/get-raffles';
import { RAFFLE_SORT_OPTION, RAFFLE_STATUS } from '@/types/raffle';
import type { Raffle } from '@/types/raffle';

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

const PRIZE_TITLE_PRIORITY = [
	'Prediction Market',
	'Actual Silver',
	'Actual Gold',
	'Kabuto PSA 10',
] as const;

function prioritizeSubscribeRaffles(raffles: readonly Raffle[]) {
	// Non-mutating sort — `code-style.md` bans `.sort()` in favour of
	// `.toSorted()` so `raffles` remains untouched for any caller that
	// later reads the original order. Raffle contract guarantees a
	// non-empty `title` (Zod parse upstream), so no `?? ''` fallback
	// is needed here.
	return raffles.toSorted((a, b) => {
		const rankA = PRIZE_TITLE_PRIORITY.findIndex(title =>
			a.title.includes(title),
		);
		const rankB = PRIZE_TITLE_PRIORITY.findIndex(title =>
			b.title.includes(title),
		);
		const normalizedRankA = rankA === -1 ? Number.MAX_SAFE_INTEGER : rankA;
		const normalizedRankB = rankB === -1 ? Number.MAX_SAFE_INTEGER : rankB;
		return normalizedRankA - normalizedRankB;
	});
}

/**
 * `/subscribe` — public landing page for the credit-purchase flow.
 *
 * Uses the dedicated `SubscribeNavbar` (logo + Trustpilot only)
 * instead of `PublicNavbar` — the page is a conversion surface and
 * every extra link in the header is a leak away from the credit
 * purchase CTA. Session reading is unnecessary here: the page's
 * single CTA posts directly to the Fanbasis public-credit checkout
 * from `credit-purchase-card.tsx`, which is the same flow for
 * anonymous and returning visitors alike — the embedded Fanbasis SDK
 * collects email + card + terms inside its own iframe, so there is no
 * pre-iframe payload for the FE to validate or branch on.
 *
 * @returns Marketing shell (minimal navbar + marquee + 5 content sections)
 */
export default async function SubscribePage() {
	const rafflesResponse = await getRaffles({
		status: RAFFLE_STATUS.LIVE,
		limit: PRIZE_SHOWCASE_LIMIT,
		sort: RAFFLE_SORT_OPTION.TRENDING,
	});

	// Prize fetch failures collapse the section (handled in `PrizeSection`)
	// rather than 500 the whole marketing landing.
	const raffles = rafflesResponse.success
		? prioritizeSubscribeRaffles(rafflesResponse.data.raffles)
		: [];

	return (
		<SubscribeNavbar
			topBanner={
				<MarqueeBanner
					message={SUBSCRIBE_MARQUEE_MESSAGE}
					bgClassName="bg-brand-sky"
				/>
			}
		>
			<HeroSection />
			<UrgencyCountdown />
			<BenefitsSection />
			<PrizeSection raffles={raffles} />
			<CtaSection />
		</SubscribeNavbar>
	);
}
