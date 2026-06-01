import { cn } from '@/lib/class-names';

import { MOBILE_ACTIVE_TAB, MOBILE_TABS } from './hub-content';
import { HubIcon } from './hub-icon';

/**
 * Fixed bottom tab bar — the mobile replacement for the desktop sidebar.
 * Five icon+label tabs with the active one emphasised. Hidden at `lg` and up.
 *
 * The page reserves bottom padding so content never hides behind this bar.
 *
 * @returns Fixed bottom navigation for narrow viewports
 */
export function HubMobileTabbar() {
	return (
		<nav className="bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t border-black/10 backdrop-blur lg:hidden">
			<ul className="mx-auto flex max-w-md items-stretch justify-between p-2">
				{MOBILE_TABS.map(tab => {
					const isActive = tab.label === MOBILE_ACTIVE_TAB;
					return (
						<li key={tab.label} className="flex-1">
							<a
								href="#"
								aria-current={isActive ? 'page' : undefined}
								className={cn(
									'flex flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors',
									isActive ? 'text-ink-900' : 'text-ink-500',
								)}
							>
								<HubIcon
									name={tab.icon}
									className={cn('size-5', isActive && 'text-brand-dark')}
								/>
								{tab.label}
							</a>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
