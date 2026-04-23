'use client';

import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/class-names';

interface BrowseTabsProps {
	// Single featured slot — mobile-tab-aware only. Desktop's featured band
	// is rendered by the Server Component parent (sibling before <BrowseTabs>)
	// to avoid passing the same ReactNode reference into two props, which
	// React 19 flags as a keyless list in the RSC payload. Functions can't
	// cross the Server→Client boundary either, so a render-prop is out.
	featuredMobile: ReactNode;
	filtersContent: ReactNode;
	gridContent: ReactNode;
}

/**
 * Mobile-only tabs for "Featured" vs "All Raffles". Filters always visible.
 * On desktop (sm+) the Featured band is rendered by the parent above this
 * component, so this tree only handles the mobile tab-switcher path.
 */
export function BrowseTabs({
	featuredMobile,
	filtersContent,
	gridContent,
}: BrowseTabsProps) {
	const [activeTab, setActiveTab] = useState<'featured' | 'all'>('featured');

	return (
		<div>
			{/* Section Title */}
			<h2 className="font-clash-display text-headline-md mb-8 font-semibold sm:mb-10">
				See what&apos;s up for grabs right now!
			</h2>

			{/* Mobile tabs — hidden on sm+ */}
			<div className="mb-6 flex items-center justify-center gap-6 sm:hidden">
				<button
					type="button"
					onClick={() => setActiveTab('featured')}
					className={cn(
						'font-clash-display tracking-micro text-ink-800 text-2xl font-semibold',
						activeTab === 'featured'
							? 'border-b-3 border-black pb-1'
							: 'pb-1.75 opacity-50',
					)}
				>
					Featured
				</button>
				<button
					type="button"
					onClick={() => setActiveTab('all')}
					className={cn(
						'font-clash-display tracking-micro text-ink-800 text-2xl font-semibold',
						activeTab === 'all'
							? 'border-b-3 border-black pb-1'
							: 'pb-1.75 opacity-50',
					)}
				>
					All Sweepstakes
				</button>
			</div>

			{/* Filters — always visible; on desktop inline with title */}
			<div className="mb-8 sm:-mt-14.5 sm:flex sm:justify-end">
				{filtersContent}
			</div>

			{/* Mobile-only featured pane: shown above the grid when the Featured
			    tab is active. Kept as its own sibling (not grouped with the grid
			    in a shared wrapper) to avoid two keyless prop-slot expressions
			    sitting as siblings — React 19 flags that shape as a dynamic list
			    and warns about missing keys on the incoming nodes. */}
			{activeTab === 'featured' ? (
				<div className="sm:hidden">{featuredMobile}</div>
			) : null}

			{/* Grid — rendered once, unconditionally. Both mobile tabs
			    ("Featured" and "All Sweepstakes") show the grid, and desktop shows
			    it below the featured cards, so there is no layout branch that
			    hides it. Wrapped in a stable `<div>` (matching the filters and
			    mobile-featured wrappers above) so React 19 sees every prop-slot
			    child at a deterministic tree position — a bare `{gridContent}`
			    next to the conditional `featuredMobile` sibling made the pair
			    look like a dynamic list and warned about missing keys on the
			    incoming `<div>` at page.tsx:295. */}
			<div>{gridContent}</div>
		</div>
	);
}
