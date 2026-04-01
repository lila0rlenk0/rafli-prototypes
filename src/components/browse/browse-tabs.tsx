'use client';

import { useState, type ReactNode } from 'react';

interface BrowseTabsProps {
	featuredContent: ReactNode;
	allRafflesContent: ReactNode;
}

/**
 * BrowseTabs Component
 *
 * Mobile-only tabs that switch between "Featured" and "All Raffles" views.
 * On desktop (sm+), both sections are visible without tabs.
 */
export function BrowseTabs({
	featuredContent,
	allRafflesContent,
}: BrowseTabsProps) {
	const [activeTab, setActiveTab] = useState<'featured' | 'all'>('featured');

	return (
		<>
			{/* Mobile tabs — hidden on sm+ */}
			<div className="mb-6 flex items-center gap-6 sm:hidden">
				<button
					type="button"
					onClick={() => setActiveTab('featured')}
					className={`font-clash-display text-2xl font-semibold tracking-[0.12px] text-[#151516] ${
						activeTab === 'featured'
							? 'border-b-[3px] border-black pb-1'
							: 'pb-[7px] opacity-50'
					}`}
				>
					Featured
				</button>
				<button
					type="button"
					onClick={() => setActiveTab('all')}
					className={`font-clash-display text-2xl font-semibold tracking-[0.12px] text-[#151516] ${
						activeTab === 'all'
							? 'border-b-[3px] border-black pb-1'
							: 'pb-[7px] opacity-50'
					}`}
				>
					All Raffles
				</button>
			</div>

			{/* Mobile: show active tab content only */}
			<div className="sm:hidden">
				{activeTab === 'featured' ? featuredContent : allRafflesContent}
			</div>

			{/* Desktop: show both sections */}
			<div className="hidden sm:block">
				{featuredContent}
				{allRafflesContent}
			</div>
		</>
	);
}
