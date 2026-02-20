import {
	parsePage,
	parseRaffleStatus,
} from '@/app/(protected)/lib/parse-search-params';
import { RaffleCard } from '@/app/(protected)/my-raffles/raffle-card';
import { StatusTabs } from '@/app/(protected)/my-raffles/status-tabs';
import { BugIcon } from '@/assets/icons/bug-icon';
import { getUserModeCookie } from '@/lib/mode/cookies';
import { getEnrolledRaffles } from '@/services/raffle/get-enrolled-raffles';
import { getMyRaffles } from '@/services/raffle/get-my-raffles';
import { RAFFLE_STATUS } from '@/types/raffle';
import { USER_MODE } from '@/types/user-mode';
import Link from 'next/link';
import { Suspense } from 'react';
import { CreateRaffleButton } from './create-raffle-button';
import { PageHeader } from './page-header';

interface PageProps {
	searchParams: Promise<{
		status?: string;
		page?: string;
	}>;
}

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
 * My Raffles Page
 *
 * Mode-aware dashboard showing user's raffles filtered by status.
 * - Host mode: Shows raffles created by the user (via /me/raffles)
 * - Participant mode: Shows raffles user has enrolled in (via /me/enrolled-raffles)
 */
export default async function MyRafflesPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const mode = await getUserModeCookie();
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
			<div className="flex h-[50vh] w-full flex-col items-center justify-center gap-10 text-center">
				<BugIcon />

				<hgroup className="space-y-4">
					<h2 className="text-xl font-semibold">Error loading your raffles</h2>
					<p className="mt-2 text-lg">
						Something went wrong while trying to load your raffles.
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
				title: 'No scheduled raffles',
				description: "You don't have any scheduled raffles yet.",
			};
		}
		// Check if any status in the list is ended (cancelled, completed, or ended)
		if (
			statusList.includes(RAFFLE_STATUS.CANCELLED) ||
			statusList.includes(RAFFLE_STATUS.COMPLETED) ||
			statusList.includes(RAFFLE_STATUS.ENDED)
		) {
			return {
				title: 'No ended raffles',
				description: isHost
					? "You don't have any completed raffles yet."
					: "You haven't participated in any ended raffles yet.",
			};
		}
		return {
			title: isHost ? 'No active raffles' : 'No enrolled raffles',
			description: isHost
				? 'Create your first raffle to get started!'
				: "You haven't enrolled in any raffles yet.",
		};
	}

	const emptyMessage = getEmptyMessage();

	return (
		<div className="container mx-auto w-full max-w-7xl px-4 py-8 lg:min-w-5xl">
			{/* Header Section */}
			<PageHeader />

			<div className="relative mb-8 flex w-full items-center justify-center">
				<Suspense>
					<StatusTabs />
				</Suspense>

				{isHost && (
					<div className="absolute right-0">
						<CreateRaffleButton />
					</div>
				)}
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
