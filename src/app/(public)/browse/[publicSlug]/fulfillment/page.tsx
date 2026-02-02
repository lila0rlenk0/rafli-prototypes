import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { WinnersTable } from '@/components/fulfillment/winners-table';
import { getSession } from '@/lib/auth/session';
import { getRaffle } from '@/services/raffle/get-raffle';
import { getRaffleWinnings } from '@/services/winning/get-raffle-winnings';
import { RAFFLE_STATUS } from '@/types/raffle';

interface PageProps {
	params: Promise<{
		publicSlug: string;
	}>;
}

/**
 * Fulfillment Management Page
 *
 * Host-only page to manage fulfillment for all winners of a raffle.
 * Protected by manual auth check (host ownership).
 */
export default async function FulfillmentPage({ params }: PageProps) {
	const { publicSlug } = await params;

	// Auth check
	const session = await getSession();
	if (!session?.user?.id) {
		redirect('/sign-in');
	}

	// Fetch raffle
	const raffleResult = await getRaffle(publicSlug);
	if (!raffleResult.success) {
		redirect(`/browse/${publicSlug}`);
	}

	const raffle = raffleResult.data;

	// Host ownership check
	if (raffle.hostId !== session.user.id) {
		redirect(`/browse/${publicSlug}`);
	}

	// Raffle must be concluded
	const concludedStatuses = [
		RAFFLE_STATUS.ENDED,
		RAFFLE_STATUS.FULFILLING,
		RAFFLE_STATUS.COMPLETED,
	] as const;
	if (
		!concludedStatuses.includes(
			raffle.status as (typeof concludedStatuses)[number],
		)
	) {
		redirect(`/browse/${publicSlug}`);
	}

	// Fetch winners
	const winningsResult = await getRaffleWinnings(raffle.id);
	const winners = winningsResult.success ? winningsResult.data.winnings : [];

	return (
		<div className="container mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
			<Link
				href={`/browse/${publicSlug}`}
				className="flex w-fit items-center gap-2"
			>
				<ArrowLeft className="size-4" />
				<span className="font-semibold">Back to Raffle</span>
			</Link>

			<div className="space-y-2">
				<h1 className="font-clash-display text-3xl font-bold">
					Manage Fulfillment
				</h1>
				<p className="text-gray-500">{raffle.title}</p>
			</div>

			<WinnersTable winners={winners} />
		</div>
	);
}
