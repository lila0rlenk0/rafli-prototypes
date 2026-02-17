'use client';

import { cn } from '@/lib/utils';
import { RAFFLE_STATUS } from '@/types/raffle';
import { USER_MODE, type UserMode } from '@/types/user-mode';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface StatusTabsProps {
	mode?: UserMode | null;
}

/**
 * StatusTabs Component
 *
 * Displays tabs for filtering raffles by status:
 * - Created: Draft or Queued (Host mode only)
 * - Participating: Live
 * - Ended: Cancelled, Completed, Ended or Fulfilling
 * with an indicator line below the active tab.
 *
 * @param mode - User mode to determine which tabs to show
 */
export function StatusTabs({ mode }: StatusTabsProps) {
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
	 * Handles Created tab click
	 * Sends multiple status: draft,queued
	 */
	function handleCreatedClick() {
		const createdStatuses = `${RAFFLE_STATUS.DRAFT},${RAFFLE_STATUS.QUEUED}`;
		handleStatusChange(createdStatuses);
	}

	/**
	 * Handles Ended tab click
	 * Sends multiple status: cancelled,completed,ended,fulfilling
	 */
	function handleEndedClick() {
		const endedStatuses = `${RAFFLE_STATUS.CANCELLED},${RAFFLE_STATUS.COMPLETED},${RAFFLE_STATUS.ENDED},${RAFFLE_STATUS.FULFILLING}`;
		handleStatusChange(endedStatuses);
	}

	const isHost = mode === USER_MODE.HOST;

	// Determine which tab is active by checking if current status is in the group
	// Created: Draft or Queued (Host only)
	const statusList = statusParam ? statusParam.split(',') : [];
	const isCreated =
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
			{/* Created Tab - Host only */}
			{isHost && (
				<button
					type="button"
					onClick={handleCreatedClick}
					className={cn(
						'relative cursor-pointer px-2 text-center text-lg leading-none font-semibold',
						'text-[rgba(15,15,15,0.95)] transition-colors',
						'hover:text-black',
					)}
				>
					Created
					{isCreated && (
						<div className="absolute top-full right-0 left-0 mt-1 h-0.5 w-full bg-black" />
					)}
				</button>
			)}

			{/* Participating Tab */}
			<button
				type="button"
				onClick={() => handleStatusChange(RAFFLE_STATUS.LIVE)}
				className={cn(
					'relative cursor-pointer px-2 text-center text-lg leading-none font-semibold',
					'text-[rgba(15,15,15,0.95)] transition-colors',
					'hover:text-black',
				)}
			>
				Participating
				{isParticipating && (
					<div className="absolute top-full right-0 left-0 mt-1 h-0.5 w-full bg-black" />
				)}
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
				{isEnded && (
					<div className="absolute top-full right-0 left-0 mt-1 h-0.5 w-full bg-black" />
				)}
			</button>
		</div>
	);
}
