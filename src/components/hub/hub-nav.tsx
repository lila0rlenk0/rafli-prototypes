import { Bell, Coins, HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { GUEST_COPY, HUB_CREDITS_COUNT, type HubMode } from './hub-content';
import { HubLogo } from './hub-logo';

interface HubNavProps {
	/** Audience mode — guest swaps the credits chip for log-in/subscribe. */
	readonly mode?: HubMode;
}

/**
 * Hub top bar — logo on the left; help/bell icons plus an account zone on the
 * right. Subscribed shows a credits chip + "Manage plan"; guest shows
 * "Log in" + "Subscribe".
 *
 * Static prototype chrome: links are non-functional anchors. Sticky so it
 * stays pinned above the scrolling content, matching the Figma nav (1440×64).
 *
 * @param mode - Audience mode (defaults to subscribed)
 * @returns Sticky top navigation bar
 */
export function HubNav({ mode = 'subscribed' }: HubNavProps) {
	const isGuest = mode === 'guest';

	return (
		<header className="bg-background/90 sticky top-0 z-30 border-b border-black/10 backdrop-blur">
			<nav className="max-w-hero mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
				<HubLogo />

				<div className="flex items-center gap-2 sm:gap-4">
					<button
						type="button"
						aria-label="Help"
						className="text-ink-700 hover:text-ink-900 hidden transition-colors sm:block"
					>
						<HelpCircle className="size-5" />
					</button>
					<button
						type="button"
						aria-label="Notifications"
						className="text-ink-700 hover:text-ink-900 hidden transition-colors sm:block"
					>
						<Bell className="size-5" />
					</button>

					{isGuest ? (
						<>
							<Button variant="ghost" size="sm">
								{GUEST_COPY.logIn}
							</Button>
							<Button size="sm">{GUEST_COPY.subscribe}</Button>
						</>
					) : (
						<>
							<span className="bg-brand-yellow text-ink-900 inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-sm font-semibold">
								<Coins className="size-4" />
								{HUB_CREDITS_COUNT} credits
							</span>
							<a
								href="#plan"
								className="text-ink-900 hidden text-sm font-medium underline-offset-4 hover:underline sm:block"
							>
								Manage plan
							</a>
						</>
					)}
				</div>
			</nav>
		</header>
	);
}
