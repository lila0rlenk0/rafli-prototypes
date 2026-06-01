import { BgDecor } from '@/components/hub/bg-decor';
import { CreditsBadge } from '@/components/hub/credits-badge';
import { GamesDeck } from '@/components/hub/games/games-deck';
import { HUB_HEADER, MOBILE_GAMES_INTRO } from '@/components/hub/hub-content';
import { HubMobileTabbar } from '@/components/hub/hub-mobile-tabbar';
import { HubNav } from '@/components/hub/hub-nav';
import { HubSidebar } from '@/components/hub/hub-sidebar';
import { PageHeader } from '@/components/hub/page-header';
import { PerksCard } from '@/components/hub/perks-card';
import { RecentActivity } from '@/components/hub/recent-activity';
import { Starfield } from '@/components/hub/starfield';
import { WeeklyStreak } from '@/components/hub/weekly-streak';
import { WinnersTicker } from '@/components/hub/winners-ticker';

/**
 * Subscription Hub — the landing surface for a subscribed (PRO) user.
 *
 * Pure visualization Server Component: all content comes from
 * `@/components/hub/hub-content`, with no fetching, server actions, or hooks.
 * The body uses CSS `order` utilities to reflow between the desktop and
 * mobile arrangements from Figma — desktop leads with the games grid and
 * tucks the streak beneath it; mobile lifts the streak above the games and
 * inserts a "PICK YOUR POISON" games intro. The sidebar is desktop-only and
 * is replaced by a fixed bottom tab bar on narrow viewports.
 *
 * @returns The fully composed subscription hub page
 */
export default function HubPage() {
	return (
		<>
			<BgDecor />
			<Starfield />
			<HubNav />
			<WinnersTicker />

			<div className="max-w-hero mx-auto flex gap-8 px-4 pt-8 pb-28 sm:px-8 lg:pb-12">
				<HubSidebar />

				<div className="flex min-w-0 flex-1 flex-col gap-12">
					{/* 1 · Hero header — credits badge opposite the title */}
					<div className="order-1">
						<PageHeader
							eyebrow={HUB_HEADER.eyebrow}
							title={HUB_HEADER.title}
							subtitle={HUB_HEADER.subtitle}
							aside={<CreditsBadge />}
							size="hero"
						/>
					</div>

					{/* Games — desktop slot 2, mobile slot 3 (after streak).
					    `id` + `scroll-mt` is the jump target for the streak's
					    today-tile Play button (offset clears the sticky nav). */}
					<section id="games" className="order-3 scroll-mt-28 lg:order-2">
						<div className="mb-4 lg:hidden">
							<PageHeader
								eyebrow={MOBILE_GAMES_INTRO.eyebrow}
								title={MOBILE_GAMES_INTRO.title}
								subtitle={MOBILE_GAMES_INTRO.subtitle}
							/>
						</div>
						<GamesDeck />
					</section>

					{/* Weekly streak — desktop slot 3, mobile slot 2 (above games) */}
					<div className="order-2 lg:order-3">
						<WeeklyStreak state="mid-run" />
					</div>

					{/* Activity + merged "good stuff" card (plan + credits + perks).
					    No `items-start` — the grid stretches both cards to equal
					    height so the activity block matches the perks block. */}
					<div className="order-4 grid gap-6 lg:grid-cols-2">
						<RecentActivity state="populated" />
						<PerksCard />
					</div>
				</div>
			</div>

			<HubMobileTabbar />
		</>
	);
}
