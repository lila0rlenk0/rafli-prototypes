import { BugIcon } from '@/assets/icons/bug-icon';
import { HostProfileCard } from '@/components/host/host-profile-card';
import { PublicRaffleCard } from '@/components/raffle/public-raffle-card';
import { getHostProfile } from '@/services/host/get-host-profile';
import { getHostRaffles } from '@/services/host/get-host-raffles';
import { HOST_ERROR_CODES } from '@/types/errors';
import { RAFFLE_STATUS } from '@/types/raffle';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { PageHeader } from './page-header';
import { StatusTabs } from './status-tabs';

interface PageProps {
	params: Promise<{
		username: string;
	}>;
	searchParams: Promise<{
		status?: string;
	}>;
}

/**
 * Status filter values for the API
 * Active: only live raffles
 * Ended: ended, fulfilling, completed, cancelled raffles
 */
const STATUS_FILTERS = {
	active: RAFFLE_STATUS.LIVE,
	ended: `${RAFFLE_STATUS.ENDED},${RAFFLE_STATUS.FULFILLING},${RAFFLE_STATUS.COMPLETED},${RAFFLE_STATUS.CANCELLED}`,
} as const;

/**
 * Public Host Profile Page
 *
 * Server Component — displays a host's public profile with their raffles.
 * Data-fetching: parallel Promise.all for profile + raffles (independent calls).
 * URL-based tab filtering: ?status=ended switches between active and concluded raffles.
 *
 * Data flow: params.username → detect UUID vs username → build query →
 * parallel fetch profile + raffles → render sidebar card + raffle grid.
 */
export default async function HostProfilePage({
	params,
	searchParams,
}: PageProps) {
	// Step 1: Parse route params and determine identifier type.
	const { username: identifier } = await params;
	const { status: statusParam } = await searchParams;

	// UUID vs username — backend accepts both, but the query param key differs.
	// Old raffle links use hostId (UUID), new links use username. Accept any UUID
	// version here (not just v7) since this is a routing heuristic, not a contract
	// boundary — legacy emailed/bookmarked links may still carry v4 IDs, and the
	// backend resolves any valid UUID. Body-schema payloads that reach the BE
	// still validate against v7 via the typed schemas in `@/types/*`.
	const isUUID = z.uuid().safeParse(identifier).success;

	// Step 2: Build raffle query with status filter from URL.
	const isEnded = statusParam === 'ended';
	const statusFilter = isEnded ? STATUS_FILTERS.ended : STATUS_FILTERS.active;

	const raffleQuery = isUUID
		? { hostId: identifier, status: statusFilter, limit: 12 }
		: { username: identifier, status: statusFilter, limit: 12 };

	// Step 3: Fetch profile and raffles in parallel — no dependency between them.
	const [profileResponse, rafflesResponse] = await Promise.all([
		getHostProfile(identifier),
		getHostRaffles(raffleQuery),
	]);

	if (!profileResponse.success) {
		if (profileResponse.error === HOST_ERROR_CODES.NOT_FOUND) {
			notFound();
		}

		return (
			<div className="flex h-[50vh] w-full flex-col items-center justify-center gap-10 text-center">
				<BugIcon />

				<hgroup className="space-y-4">
					<h2 className="text-xl font-semibold">Error loading profile</h2>
					<p className="mt-2 text-lg">
						Something went wrong while trying to load this host&apos;s profile.
					</p>
				</hgroup>

				<Link
					href="/browse"
					className="rounded-full border border-black px-12 py-3 text-sm font-semibold text-black transition-colors"
				>
					Back to Browse
				</Link>
			</div>
		);
	}

	const host = profileResponse.data;

	if (!rafflesResponse.success) {
		return (
			<div className="container mx-auto w-full max-w-7xl px-4 py-8 lg:min-w-5xl">
				{/* Header Section */}
				<PageHeader />

				<div className="relative mb-8 flex w-full items-center justify-center">
					<Suspense>
						<StatusTabs />
					</Suspense>
				</div>

				{/* Content Section */}
				<div className="flex flex-col gap-8 lg:flex-row">
					<aside className="w-full shrink-0 lg:w-80">
						<HostProfileCard host={host} className="lg:sticky lg:top-24" />
					</aside>

					<main className="flex-1">
						<div className="flex flex-col items-center justify-center py-20 text-center">
							<h3 className="text-xl font-semibold text-gray-900">
								Error loading raffles
							</h3>
							<p className="mt-2 text-gray-500">Please try again later.</p>
						</div>
					</main>
				</div>
			</div>
		);
	}

	const { raffles } = rafflesResponse.data;

	const emptyMessage = isEnded
		? {
				title: 'No ended raffles',
				description: 'This host has no ended raffles yet.',
			}
		: {
				title: 'No active raffles',
				description: 'This host has no active raffles right now.',
			};

	return (
		<div className="container mx-auto w-full max-w-7xl px-4 py-8 lg:min-w-5xl">
			<PageHeader />

			<div className="relative mb-8 flex w-full items-center justify-center">
				<Suspense fallback={null}>
					<StatusTabs />
				</Suspense>
			</div>

			<div className="flex flex-col gap-8 lg:flex-row">
				<aside className="w-full shrink-0 lg:w-80">
					<HostProfileCard host={host} className="lg:sticky lg:top-24" />
				</aside>

				<main className="flex-1">
					{raffles.length > 0 ? (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
							{raffles.map(raffle => (
								<PublicRaffleCard key={raffle.id} raffle={raffle} />
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
				</main>
			</div>
		</div>
	);
}
