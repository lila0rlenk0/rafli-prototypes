'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

interface HostStatusTabsProps {
	/** Count of active raffles */
	activeCount: number;
	/** Count of ended raffles */
	endedCount: number;
}

/**
 * HostStatusTabs Component
 *
 * Displays tab navigation for active vs ended raffles.
 * Uses URL state for tab selection.
 */
export function HostStatusTabs({
	activeCount,
	endedCount,
}: HostStatusTabsProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const currentStatus = searchParams.get('status');

	/**
	 * Determines if a tab is currently active
	 * @param tab - Tab identifier ('active' or 'ended')
	 * @returns true if the tab is active
	 */
	function isTabActive(tab: 'active' | 'ended'): boolean {
		if (tab === 'active') {
			return !currentStatus || currentStatus === 'active';
		}
		return currentStatus === 'ended';
	}

	/**
	 * Builds the URL for a tab
	 * @param tab - Tab identifier
	 * @returns URL string for the tab
	 */
	function getTabHref(tab: 'active' | 'ended'): string {
		if (tab === 'active') {
			return pathname;
		}
		return `${pathname}?status=ended`;
	}

	/**
	 * Formats the tab label with count
	 * @param label - Tab label text
	 * @param count - Count to display
	 * @returns Formatted label string
	 */
	function formatTabLabel(label: string, count: number): string {
		return `${label} (${count})`;
	}

	const tabs = [
		{
			id: 'active' as const,
			label: formatTabLabel('Active', activeCount),
		},
		{
			id: 'ended' as const,
			label: formatTabLabel('Ended', endedCount),
		},
	];

	return (
		<div className="flex gap-6 border-b border-gray-200">
			{tabs.map(tab => {
				const isActive = isTabActive(tab.id);
				return (
					<Link
						key={tab.id}
						href={getTabHref(tab.id)}
						className={`relative pb-3 text-sm font-medium transition-colors ${
							isActive
								? 'text-black'
								: 'text-gray-500 hover:text-gray-700'
						}`}
					>
						{tab.label}
						{isActive && (
							<span className="absolute inset-x-0 bottom-0 h-0.5 bg-black" />
						)}
					</Link>
				);
			})}
		</div>
	);
}
