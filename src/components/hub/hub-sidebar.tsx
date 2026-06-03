import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import {
	GUEST_COPY,
	type HubMode,
	SIDEBAR_ACTIVE_LABEL,
	SIDEBAR_LINKS,
} from './hub-content';
import { HubIcon } from './hub-icon';

interface HubSidebarProps {
	/** Audience mode — guest swaps the footer buttons for log-in/subscribe. */
	readonly mode?: HubMode;
}

/**
 * Desktop left navigation rail (240px). Five primary links with the active
 * entry highlighted, plus two footer buttons — "Refer & Earn" / "Help us
 * improve" when subscribed, "Subscribe" / "Log in" when guest. Hidden below
 * `lg` where the mobile tab bar takes over.
 *
 * @param mode - Audience mode (defaults to subscribed)
 * @returns Sticky desktop sidebar
 */
export function HubSidebar({ mode = 'subscribed' }: HubSidebarProps) {
	const isGuest = mode === 'guest';
	return (
		<aside className="hidden w-60 shrink-0 lg:block">
			<div className="sticky top-24 flex flex-col gap-8">
				<nav className="flex flex-col gap-1">
					{SIDEBAR_LINKS.map(link => {
						const isActive = link.label === SIDEBAR_ACTIVE_LABEL;
						return (
							<a
								key={link.label}
								href="#"
								aria-current={isActive ? 'page' : undefined}
								className={cn(
									'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
									isActive
										? 'bg-brand-dark text-white'
										: 'text-ink-700 hover:bg-black/5',
								)}
							>
								<HubIcon name={link.icon} className="size-4.5" />
								{link.label}
							</a>
						);
					})}
				</nav>

				<div className="flex flex-col gap-2">
					{isGuest ? (
						<>
							<Button className="w-full">{GUEST_COPY.subscribe}</Button>
							<Button variant="outline" className="w-full">
								{GUEST_COPY.logIn}
							</Button>
						</>
					) : (
						<>
							<Button className="w-full">Refer &amp; Earn</Button>
							<Button variant="outline" className="w-full">
								Help us improve
							</Button>
						</>
					)}
				</div>
			</div>
		</aside>
	);
}
