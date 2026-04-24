import Link from 'next/link';
import { Suspense } from 'react';

import { CreateRaffleButton } from '@/components/my-raffles/create-raffle-button';
import { PageHeader } from '@/components/my-raffles/page-header';
import { RaffleCard } from '@/components/my-raffles/raffle-card';
import { StatusTabs } from '@/components/my-raffles/status-tabs';
import {
	parsePage,
	parseRaffleStatus,
} from '@/lib/utils/raffle/raffle-search-params';
import { BugIcon } from '@/assets/icons/bug-icon';
import { SERVER_ACTION_MAX_DURATION_SECONDS } from '@/lib/api/constants';
import { getUserModeCookie } from '@/lib/mode/cookies';
import { getEnrolledRaffles } from '@/services/raffle/get-enrolled-raffles';
import { getMyRaffles } from '@/services/raffle/get-my-raffles';
import { RAFFLE_STATUS } from '@/types/raffle';
import { USER_MODE } from '@/types/user-mode';

interface PageProps {
	searchParams: Promise<{
		status?: string;
		page?: string;
	}>;
}

export const maxDuration = SERVER_ACTION_MAX_DURATION_SECONDS;

/**
 * Filters out draft/queued statuses for participants
 * These statuses are only valid for hosts
 *
 * @param status - Comma-separated status string
 * @returns Filtered status string with only valid participant statuses
 */
function filterParticipantStatus(status: string): string {
	const invalidStatuses = [RAFFLE_STATUS.DRAFT, RAFFLE_STATUS.QUEUED];
	const filtered = status
		.split(',')
		.filter(
			s => !invalidStatuses.includes(s as (typeof invalidStatuses)[number]),
		);
	return filtered.length > 0 ? filtered.join(',') : RAFFLE_STATUS.LIVE;
}

/**
 * My Raffles Page (Server Component)
 *
 * Data-fetching strategy: reads searchParams and user mode cookie in parallel,
 * then fetches raffles server-side via the appropriate endpoint based on mode.
 * Uses MY_RAFFLES cache tag (60s TTL) — revalidated on create/publish/delete.
 *
 * Mode-aware dashboard:
 * - Host mode: Shows raffles created by the user (via /me/raffles)
 * - Participant mode: Shows raffles user has enrolled in (via /me/enrolled-raffles)
 */
export default async function MyRafflesPage({ searchParams }: PageProps) {
	// Parallel fetch — searchParams and cookie read are independent
	const [params, mode] = await Promise.all([searchParams, getUserModeCookie()]);
	const isHost = mode === USER_MODE.HOST;

	// Default to 'live' status when no status param (Live tab is active by default)
	const status = parseRaffleStatus(params.status) ?? RAFFLE_STATUS.LIVE;
	const page = parsePage(params.page);

	// Filter out invalid statuses for participants (draft/queued are host-only)
	const effectiveStatus = isHost ? status : filterParticipantStatus(status);

	// Call appropriate endpoint based on mode
	const response = isHost
		? await getMyRaffles({ status: effectiveStatus, page, limit: 10 })
		: await getEnrolledRaffles({ status: effectiveStatus, page, limit: 10 });

	if (!response.success) {
		return (
			<div className="h-half-screen flex w-full flex-col items-center justify-center gap-10 text-center">
				<BugIcon />

				<hgroup className="flex flex-col gap-4">
					<h2 className="text-xl font-semibold">
						Error loading your sweepstakes
					</h2>
					<p className="mt-2 text-lg">
						Something went wrong while trying to load your sweepstakes.
					</p>
				</hgroup>

				<Link
					href="/raffles"
					className="rounded-full border border-black px-12 py-3 text-sm font-semibold text-black transition-colors"
				>
					Raffles
				</Link>
			</div>
		);
	}

	const { raffles } = response.data;
	const statusList = status ? status.split(',') : [];

	// Determine message based on status and mode
	function getEmptyMessage() {
		// Check if any status in the list is scheduled (draft or queued) - host only
		if (
			isHost &&
			(statusList.includes(RAFFLE_STATUS.DRAFT) ||
				statusList.includes(RAFFLE_STATUS.QUEUED))
		) {
			return {
				title: 'No scheduled sweepstakes',
				description: "You don't have any scheduled sweepstakes yet.",
			};
		}
		// Check if any status in the list is ended (cancelled, completed, or ended)
		if (
			statusList.includes(RAFFLE_STATUS.CANCELLED) ||
			statusList.includes(RAFFLE_STATUS.COMPLETED) ||
			statusList.includes(RAFFLE_STATUS.ENDED)
		) {
			return {
				title: 'No ended sweepstakes',
				description: isHost
					? "You don't have any completed sweepstakes yet."
					: "You haven't participated in any ended sweepstakes yet.",
			};
		}
		return {
			title: isHost ? 'No active sweepstakes' : 'No sweepstakes entered',
			description: isHost
				? 'Create your first sweepstakes to get started!'
				: "You haven't entered any sweepstakes yet.",
		};
	}

	const emptyMessage = getEmptyMessage();

	return (
		<div className="container mx-auto w-full max-w-7xl px-4 py-8 lg:min-w-5xl">
			{/* Header Section */}
			<PageHeader />

			<div className="relative mb-8 flex w-full items-center justify-center">
				<Suspense fallback={null}>
					<StatusTabs />
				</Suspense>

				{isHost ? (
					<div className="absolute right-0">
						<CreateRaffleButton />
					</div>
				) : null}
			</div>

			{/* Grid Section */}
			{raffles && raffles.length > 0 ? (
				<div className="flex flex-wrap items-center justify-center gap-6">
					{raffles.map(raffle => (
						<RaffleCard key={raffle.id} raffle={raffle} />
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<h3 className="text-xl font-semibold text-gray-900">
						{emptyMessage.title}
					</h3>
					<p className="mt-2 text-gray-500">{emptyMessage.description}</p>
				</div>
			)}
		</div>
	);
}
