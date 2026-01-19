import {
	parsePage,
	parseRaffleStatus,
} from '@/app/(protected)/lib/parse-search-params';
import { RaffleCard } from '@/app/(protected)/my-raffles/raffle-card';
import { StatusTabs } from '@/app/(protected)/my-raffles/status-tabs';
import { getMyRaffles } from '@/services/raffle/get-my-raffles';
import { RAFFLE_STATUS } from '@/types/raffle';
import { CreateRaffleButton } from './create-raffle-button';

interface PageProps {
	searchParams: Promise<{
		status?: string;
		page?: string;
	}>;
}

/**
 * My Raffles Page
 *
 * Host dashboard showing user's own raffles filtered by status.
 * Displays live, queued, and ended raffles with creation controls.
 */
export default async function MyRafflesPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const status = parseRaffleStatus(params.status);
	const page = parsePage(params.page);

	const response = await getMyRaffles({
		status,
		page,
		limit: 10,
	});

	if (!response.success) {
		return (
			<div className="flex h-[50vh] w-full items-center justify-center">
				<div className="text-center">
					<h3 className="text-lg font-medium text-red-600">
						Error loading raffles
					</h3>
					<p className="mt-2 text-gray-500">Failed to load raffles</p>
				</div>
			</div>
		);
	}

	const { raffles } = response.data;
	const currentStatus = status || RAFFLE_STATUS.LIVE;

	// Determine message based on status
	function getEmptyMessage() {
		if (currentStatus === RAFFLE_STATUS.QUEUED) {
			return {
				title: 'No scheduled raffles',
				description: "You don't have any scheduled raffles yet.",
			};
		}
		if (
			currentStatus === RAFFLE_STATUS.ENDED ||
			currentStatus === RAFFLE_STATUS.COMPLETED
		) {
			return {
				title: 'No ended raffles',
				description: "You don't have any completed raffles yet.",
			};
		}
		return {
			title: 'No active raffles',
			description: 'Create your first raffle to get started!',
		};
	}

	const emptyMessage = getEmptyMessage();

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			{/* Header Section */}
			<div className="mb-12 text-center">
				<h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
					My Raffles!
				</h1>
			</div>

			<div className="relative mb-8 flex w-full items-center justify-center">
				<StatusTabs />

				<div className="absolute right-0">
					<CreateRaffleButton />
				</div>
			</div>

			{/* Grid Section */}
			{raffles && raffles.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
