import { BgDecor } from '@/components/hub/bg-decor';
import { CreditsBadge } from '@/components/hub/credits-badge';
import { GameCard } from '@/components/hub/game-card';
import {
	HUB_GAMES,
	HUB_HEADER_GUEST,
	MOBILE_GAMES_INTRO,
} from '@/components/hub/hub-content';
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
 * Subscription Hub — logged-out / guest view (`/hub/guest`).
 *
 * The mirror of `/hub` for a visitor who is not logged in or subscribed.
 * Every surface keeps its wireframe but flips to a locked "log in &
 * subscribe" prompt that still previews the value on offer: games show the
 * perk pill but no play button, the streak is blocked, the plan card becomes
 * a "Choose a plan" chooser, and credits / activity / perks read as locked
 * empty states. Pure visualization — no auth, no data, no hooks.
 *
 * @returns The guest subscription hub page
 */
export default function HubGuestPage() {
	return (
		<>
			<BgDecor />
			<Starfield />
			<HubNav mode="guest" />
			<WinnersTicker />

			<div className="max-w-hero mx-auto flex gap-8 px-4 pt-8 pb-28 sm:px-8 lg:pb-12">
				<HubSidebar mode="guest" />

				<div className="flex min-w-0 flex-1 flex-col gap-12">
					{/* 1 · Hero header — locked credits badge opposite the title */}
					<div className="order-1">
						<PageHeader
							eyebrow={HUB_HEADER_GUEST.eyebrow}
							title={HUB_HEADER_GUEST.title}
							subtitle={HUB_HEADER_GUEST.subtitle}
							aside={<CreditsBadge locked />}
							size="hero"
						/>
					</div>

					{/* Games — desktop slot 2, mobile slot 3 (after streak) */}
					<section id="games" className="order-3 scroll-mt-28 lg:order-2">
						<div className="mb-4 lg:hidden">
							<PageHeader
								eyebrow={MOBILE_GAMES_INTRO.eyebrow}
								title={MOBILE_GAMES_INTRO.title}
								subtitle={MOBILE_GAMES_INTRO.subtitle}
							/>
						</div>
						<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{HUB_GAMES.map(game => (
								<GameCard key={game.id} game={game} state="guest" />
							))}
						</div>
					</section>

					{/* Weekly streak — desktop slot 3, mobile slot 2 (above games) */}
					<div className="order-2 lg:order-3">
						<WeeklyStreak state="guest" />
					</div>

					{/* Empty activity + merged "good stuff" card (choose plan +
					    locked credits + locked perks) */}
					<div className="order-4 grid gap-6 lg:grid-cols-2">
						<RecentActivity state="guest" />
						<PerksCard mode="guest" />
					</div>
				</div>
			</div>

			<HubMobileTabbar />
		</>
	);
}
