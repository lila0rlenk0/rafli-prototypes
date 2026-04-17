import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { WinnersTable } from '@/components/fulfillment/winners-table';
import { PublicNavbar } from '@/components/ui/public-navbar';
import { getSession } from '@/lib/auth/session';
import { getRaffle } from '@/services/raffle/get-raffle';
import { getRaffleWinnings } from '@/services/winning/get-raffle-winnings';
import { CONCLUDED_STATUSES, type ConcludedStatus } from '@/types/raffle';

interface PageProps {
	params: Promise<{
		publicSlug: string;
	}>;
}

/**
 * Fulfillment Management Page
 *
 * Server Component — host-only page to manage fulfillment for all winners.
 * No middleware auth — manual guard chain: auth → raffle exists → ownership → concluded status.
 * Each guard redirects to the appropriate fallback.
 *
 * Data-fetching: session + raffle in parallel (Step 1), winners sequential (Step 2, depends on raffle.id).
 */
export default async function FulfillmentPage({ params }: PageProps) {
	const { publicSlug } = await params;

	// Step 1: Fetch session and raffle in parallel — neither depends on the other.
	const [session, raffleResult] = await Promise.all([
		getSession(),
		getRaffle(publicSlug),
	]);

	// Guard: require authentication
	if (!session?.user?.id) {
		redirect('/sign-in');
	}

	// Guard: raffle must exist
	if (!raffleResult.success) {
		redirect(`/browse/${publicSlug}`);
	}

	const raffle = raffleResult.data;

	// Guard: only the raffle host can access fulfillment
	if (raffle.hostId !== session.user.id) {
		redirect(`/browse/${publicSlug}`);
	}

	// Guard: raffle must be in a concluded status (ended/fulfilling/completed)
	if (!CONCLUDED_STATUSES.includes(raffle.status as ConcludedStatus)) {
		redirect(`/browse/${publicSlug}`);
	}

	// Step 2: Fetch winners — depends on raffle.id from Step 1.
	// limit=100 — full pagination UI is out of scope; truncation acceptable at this scale.
	const winnersResult = await getRaffleWinnings(raffle.id, { limit: 100 });
	const winners = winnersResult.success ? winnersResult.data.items : [];

	return (
		// No topBanner — fulfillment is a post-conclusion host surface; the
		// share-to-earn promise no longer applies because the raffle has
		// already picked winners.
		<PublicNavbar isAuthenticated>
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

				<WinnersTable winners={winners} publicSlug={publicSlug} />
			</div>
		</PublicNavbar>
	);
}
