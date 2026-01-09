import { RaffleCard } from '@/app/(protected)/my-raffles/raffle-card';
import { Button } from '@/components/ui/button';
import { getMyRaffles } from '@/services/raffle/get-my-raffles';
import { RAFFLE_STATUS, RaffleStatus } from '@/types/raffle';
import Link from 'next/link';

interface PageProps {
	searchParams: Promise<{
		status?: string;
		page?: string;
	}>;
}

export default async function MyRafflesPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const status = (params.status as RaffleStatus) || RAFFLE_STATUS.DRAFT;
	const page = params.page ? parseInt(params.page) : 1;

	const response = await getMyRaffles({
		status,
		page,
		limit: 10,
	});

	if ('error' in response) {
		return (
			<div className="flex h-[50vh] w-full items-center justify-center">
				<div className="text-center">
					<h3 className="text-lg font-medium text-red-600">
						Error loading raffles
					</h3>
					<p className="mt-2 text-gray-500">{response.error}</p>
				</div>
			</div>
		);
	}

	const { raffles } = response;

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			{/* Header Section */}
			<div className="mb-12 text-center">
				<h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
					My Raffles!
				</h1>
				<Link href="/my-raffles/create">
					<Button>Create new Raffle</Button>
				</Link>
			</div>

			{/* Filter and Action Section */}
			<div className="mb-8 flex flex-col items-center justify-between gap-6 sm:flex-row"></div>

			{/* Grid Section */}
			{raffles && raffles.length > 0 && (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{raffles.map(raffle => (
						<RaffleCard key={raffle.id} raffle={raffle} />
					))}
				</div>
			)}
		</div>
	);
}
