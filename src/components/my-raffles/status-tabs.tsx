'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useUserStore } from '@/providers/user-store-provider';
import { RAFFLE_STATUS } from '@/types/raffle';
import { USER_MODE } from '@/types/user-mode';

/**
 * StatusTabs Component
 *
 * Displays tabs for filtering raffles by status:
 * - Scheduled: Draft or Queued (Host mode only)
 * - Participating: Live
 * - Ended: Cancelled, Completed, Ended or Fulfilling
 * with an indicator line below the active tab.
 *
 * Reads mode from Zustand store (not server prop) to stay in sync
 * with other client components after mode switches
 */
export function StatusTabs() {
	const mode = useUserStore(state => state.mode);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Get current status from URL (default to 'live' for Active)
	const statusParam = searchParams.get('status');

	/**
	 * Updates the URL with the selected status
	 * If the default status (LIVE) is selected, removes the status param from URL
	 */
	function handleStatusChange(status: string | '') {
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

	/**
	 * Handles Scheduled tab click
	 * Sends multiple status: draft,queued
	 */
	function handleScheduledClick() {
		const scheduledStatuses = `${RAFFLE_STATUS.DRAFT},${RAFFLE_STATUS.QUEUED}`;
		handleStatusChange(scheduledStatuses);
	}

	/**
	 * Handles Ended tab click
	 * Sends multiple status: cancelled,completed,ended,fulfilling
	 */
	function handleEndedClick() {
		const endedStatuses = `${RAFFLE_STATUS.CANCELLED},${RAFFLE_STATUS.COMPLETED},${RAFFLE_STATUS.ENDED},${RAFFLE_STATUS.FULFILLING}`;
		handleStatusChange(endedStatuses);
	}

	function handleLiveClick() {
		handleStatusChange(RAFFLE_STATUS.LIVE);
	}

	const isHost = mode === USER_MODE.HOST;

	// Determine which tab is active by checking if current status is in the group
	// Scheduled: Draft or Queued (Host only)
	const statusList = statusParam ? statusParam.split(',') : [];
	const isScheduled =
		statusList.includes(RAFFLE_STATUS.DRAFT) ||
		statusList.includes(RAFFLE_STATUS.QUEUED);
	// Participating: Live (default when no status param)
	const isParticipating =
		!statusParam || statusList.includes(RAFFLE_STATUS.LIVE);
	// Ended: Cancelled, Completed, Ended or Fulfilling
	const isEnded =
		statusList.includes(RAFFLE_STATUS.CANCELLED) ||
		statusList.includes(RAFFLE_STATUS.COMPLETED) ||
		statusList.includes(RAFFLE_STATUS.ENDED) ||
		statusList.includes(RAFFLE_STATUS.FULFILLING);

	return (
		<div className="relative flex items-start justify-center gap-6 pb-1">
			{/* Scheduled Tab - Host only */}
			{isHost ? (
				<button
					type="button"
					onClick={handleScheduledClick}
					className={cn(
						'relative cursor-pointer px-2 text-center text-lg leading-none font-semibold',
						'text-[rgba(15,15,15,0.95)] transition-colors',
						'hover:text-black',
					)}
				>
					Scheduled
					{isScheduled ? (
						<div className="absolute top-full right-0 left-0 mt-1 h-0.5 w-full bg-black" />
					) : null}
				</button>
			) : null}

			{/* Participating Tab */}
			<button
				type="button"
				onClick={handleLiveClick}
				className={cn(
					'relative cursor-pointer px-2 text-center text-lg leading-none font-semibold',
					'text-[rgba(15,15,15,0.95)] transition-colors',
					'hover:text-black',
				)}
			>
				Live
				{isParticipating ? (
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
