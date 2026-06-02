import { BgDecor } from '@/components/hub/bg-decor';
import { CreditsBadge } from '@/components/hub/credits-badge';
import { FloatingBlocks } from '@/components/hub/floating-blocks';
import {
	HUB_HEADER,
	HUB_HEADER_GUEST,
	type HubMode,
	MOBILE_GAMES_INTRO,
} from '@/components/hub/hub-content';
import { HubDetails } from '@/components/hub/hub-details';
import { HubGames } from '@/components/hub/hub-games';
import { HubMobileTabbar } from '@/components/hub/hub-mobile-tabbar';
import { HubNav } from '@/components/hub/hub-nav';
import { HubSidebar } from '@/components/hub/hub-sidebar';
import { PageHeader } from '@/components/hub/page-header';
import { WeeklyStreak } from '@/components/hub/weekly-streak';
import { WinnersTicker } from '@/components/hub/winners-ticker';
import { hasSubscriptionAccess, readMockState } from '@/lib/api/mock/state';

/**
 * Subscription Hub — the single landing surface, driven by subscription state.
 *
 * Reads the active mock-preview state from the request cookie (set by the
 * floating `<MockStatePanel>`) and resolves it to a binary audience `mode`:
 * a user with live subscription access sees the unlocked PRO surface
 * (playable games, populated streak/activity, credits + perks), while
 * everyone else sees the locked "log in & subscribe" surface that still
 * previews the value on offer. This cookie read is what makes the panel's
 * state toggle actually change the page — it is a dynamic Server Component.
 *
 * Mobile is deliberately compact: the games collapse into a tab strip
 * (`HubGames`) and plan/credits/perks/activity fold into one tabbed card
 * (`HubDetails`), so the page no longer stacks five tall blocks. Desktop keeps
 * its information-dense grid. All copy/data still comes from `hub-content` —
 * no fetching, server actions, or hooks.
 *
 * @returns The fully composed subscription hub page for the active state
 */
export default async function HubPage() {
	const mockState = await readMockState();
	const mode: HubMode = hasSubscriptionAccess(mockState)
		? 'subscribed'
		: 'guest';
	const isGuest = mode === 'guest';
	const header = isGuest ? HUB_HEADER_GUEST : HUB_HEADER;

	return (
		<>
			<BgDecor />
			<FloatingBlocks />
			<HubNav mode={mode} />
			<WinnersTicker />

			<div className="max-w-hero mx-auto flex gap-8 px-4 pt-8 pb-28 sm:px-8 lg:pb-12">
				<HubSidebar mode={mode} />

				<div className="flex min-w-0 flex-1 flex-col gap-12">
					{/* 1 · Hero header — credits badge opposite the title; the badge
					    locks for guests so the credit total stays hidden until sign-in */}
					<div className="order-1">
						<PageHeader
							eyebrow={header.eyebrow}
							title={header.title}
							subtitle={header.subtitle}
							aside={<CreditsBadge locked={isGuest} />}
							size="hero"
						/>
					</div>

					{/* Games — desktop slot 2, mobile slot 3 (after streak).
					    `id` + `scroll-mt` is the jump target for the streak's
					    today-tile Play button (offset clears the sticky nav).
					    `HubGames` tabs the cards on mobile and grids them on
					    desktop; subscribers play, guests see locked previews. */}
					<section id="games" className="order-3 scroll-mt-28 lg:order-2">
						<div className="mb-4 lg:hidden">
							<PageHeader
								eyebrow={MOBILE_GAMES_INTRO.eyebrow}
								title={MOBILE_GAMES_INTRO.title}
								subtitle={MOBILE_GAMES_INTRO.subtitle}
							/>
						</div>
						<HubGames mode={mode} />
					</section>

					{/* Weekly streak — desktop slot 3, mobile slot 2 (above games) */}
					<div className="order-2 lg:order-3">
						<WeeklyStreak state={isGuest ? 'guest' : 'mid-run'} />
					</div>

					{/* Account — plan + credits + perks + activity. Mobile folds
					    these into one tabbed card; desktop keeps them side by side. */}
					<div className="order-4">
						<HubDetails mode={mode} />
					</div>
				</div>
			</div>

			<HubMobileTabbar />
		</>
	);
}
