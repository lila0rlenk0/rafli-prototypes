'use client';

import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface BrowseTabsProps {
	featuredContent: ReactNode;
	filtersContent: ReactNode;
	gridContent: ReactNode;
}

/**
 * Mobile-only tabs for "Featured" vs "All Raffles". Filters always visible.
 * On desktop (sm+) both sections show without tabs.
 */
export function BrowseTabs({
	featuredContent,
	filtersContent,
	gridContent,
}: BrowseTabsProps) {
	const [activeTab, setActiveTab] = useState<'featured' | 'all'>('featured');

	return (
		<>
			{/* Section Title */}
			<h2 className="font-clash-display mb-8 text-[32px] leading-none font-semibold tracking-[0.16px] sm:mb-10 sm:text-4xl sm:tracking-[0.36px]">
				See what&apos;s up for grabs right now!
			</h2>

			{/* Mobile tabs — hidden on sm+ */}
			<div className="mb-6 flex items-center justify-center gap-6 sm:hidden">
				<button
					type="button"
					onClick={() => setActiveTab('featured')}
					className={cn(
						'font-clash-display text-2xl font-semibold tracking-[0.12px] text-[#151516]',
						activeTab === 'featured'
							? 'border-b-[3px] border-black pb-1'
							: 'pb-[7px] opacity-50',
					)}
				>
					Featured
				</button>
				<button
					type="button"
					onClick={() => setActiveTab('all')}
					className={cn(
						'font-clash-display text-2xl font-semibold tracking-[0.12px] text-[#151516]',
						activeTab === 'all'
							? 'border-b-[3px] border-black pb-1'
							: 'pb-[7px] opacity-50',
					)}
				>
					All Raffles
				</button>
			</div>

			{/* Filters — always visible; on desktop inline with title */}
			<div className="mb-8 sm:-mt-[58px] sm:flex sm:justify-end">
				{filtersContent}
			</div>

			{/* Mobile: Featured tab shows featured + grid below; All tab shows grid only */}
			<div className="sm:hidden">
				{activeTab === 'featured' ? (
					<>
						{featuredContent}
						{gridContent}
					</>
				) : (
					gridContent
				)}
			</div>

			{/* Desktop: show both sections */}
			<div className="hidden sm:block">
				{featuredContent}
				{gridContent}
			</div>
		</>
	);
}
