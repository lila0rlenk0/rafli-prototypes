'use client';

import { cn } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * StatusTabs Component
 *
 * Displays tabs for filtering host raffles by status:
 * - Active: Live raffles
 * - Ended: Cancelled, Completed, Ended, or Fulfilling raffles
 * with an indicator line below the active tab.
 */
export function StatusTabs() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Get current status from URL (default to 'active')
	const statusParam = searchParams.get('status');

	/**
	 * Updates the URL with the selected status
	 * If the default status (active) is selected, removes the status param from URL
	 */
	function handleStatusChange(status: 'active' | 'ended') {
		const params = new URLSearchParams(searchParams);

		// If selecting the default status (active), remove status param
		// Otherwise, set the status param
		if (status === 'active') {
			params.delete('status');
		} else {
			params.set('status', status);
		}

		// Reset to page 1 when status changes
		params.delete('page');

		router.push(`${pathname}?${params.toString()}`);
	}

	function handleActiveClick() {
		handleStatusChange('active');
	}

	function handleEndedClick() {
		handleStatusChange('ended');
	}

	// Determine which tab is active
	const isActive = !statusParam || statusParam === 'active';
	const isEnded = statusParam === 'ended';

	return (
		<div className="relative flex items-start justify-center gap-6 pb-1">
			{/* Active Tab */}
			<button
				type="button"
				onClick={handleActiveClick}
				className={cn(
					'relative cursor-pointer px-2 text-center text-lg leading-none font-semibold',
					'text-[rgba(15,15,15,0.95)] transition-colors',
					'hover:text-black',
				)}
			>
				Active
				{isActive ? (
					<div className="absolute top-full right-0 left-0 mt-1 h-0.5 w-full bg-black" />
				) : null}
			</button>

			{/* Ended Tab */}
			<button
				type="button"
				onClick={handleEndedClick}
				className={cn(
					'relative cursor-pointer px-2 text-center text-lg leading-none font-semibold',
					'text-[rgba(15,15,15,0.95)] transition-colors',
					'hover:text-black',
				)}
			>
				Ended
				{isEnded ? (
					<div className="absolute top-full right-0 left-0 mt-1 h-0.5 w-full bg-black" />
				) : null}
			</button>
		</div>
	);
}
