'use client';

import { cn } from '@/lib/utils';
import { RAFFLE_STATUS, type RaffleStatus } from '@/types/raffle';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * StatusTabs Component
 *
 * Displays tabs for filtering raffles by status (Active, Scheduled, Ended)
 * with an indicator line below the active tab.
 */
export function StatusTabs() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Get current status from URL (default to 'live' for Active)
	const currentStatus = searchParams.get('status') || RAFFLE_STATUS.LIVE;

	/**
	 * Updates the URL with the selected status
	 * If the default status (LIVE) is selected, removes the status param from URL
	 */
	function handleStatusChange(status: RaffleStatus | '') {
		const params = new URLSearchParams(searchParams);

		// If selecting the default status (LIVE), remove status param
		// Otherwise, set the status param
		if (status === RAFFLE_STATUS.LIVE || !status) {
			params.delete('status');
		} else {
			params.set('status', status);
		}

		// Reset to page 1 when status changes
		params.delete('page');

		router.push(`${pathname}?${params.toString()}`);
	}

	// Determine which tab is active
	const isActive = currentStatus === RAFFLE_STATUS.LIVE;
	const isScheduled = currentStatus === RAFFLE_STATUS.QUEUED;
	const isEnded =
		currentStatus === RAFFLE_STATUS.ENDED ||
		currentStatus === RAFFLE_STATUS.COMPLETED;

	return (
		<div className="relative flex items-start justify-center gap-6 pb-1">
			{/* Active Tab */}
			<button
				type="button"
				onClick={() => handleStatusChange(RAFFLE_STATUS.LIVE)}
				className={cn(
					'relative px-2 text-center text-lg leading-none font-semibold',
					'text-[rgba(15,15,15,0.95)] transition-colors',
					'hover:text-black',
				)}
			>
				Active
				{isActive && (
					<div className="absolute top-full right-0 left-0 mt-1 h-0.5 w-full bg-black" />
				)}
			</button>

			{/* Scheduled Tab */}
			<button
				type="button"
				onClick={() => handleStatusChange(RAFFLE_STATUS.QUEUED)}
				className={cn(
					'relative px-2 text-center text-lg leading-none font-semibold',
					'text-[rgba(15,15,15,0.95)] transition-colors',
					'hover:text-black',
				)}
			>
				Scheduled
				{isScheduled && (
					<div className="absolute top-full right-0 left-0 mt-1 h-0.5 w-full bg-black" />
				)}
			</button>

			{/* Ended Tab */}
			<button
				type="button"
				onClick={() => handleStatusChange(RAFFLE_STATUS.ENDED)}
				className={cn(
					'relative px-2 text-center text-lg leading-none font-semibold',
					'text-[rgba(15,15,15,0.95)] transition-colors',
					'hover:text-black',
				)}
			>
				Ended
				{isEnded && (
					<div className="absolute top-full right-0 left-0 mt-1 h-0.5 w-full bg-black" />
				)}
			</button>
		</div>
	);
}
