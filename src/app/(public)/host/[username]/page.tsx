import { BugIcon } from '@/assets/icons/bug-icon';
import { PublicPageHeader } from '@/components/host/public-page-header';
import { HostProfileCard } from '@/components/host/profile-card';
import { PublicStatusTabs } from '@/components/host/public-status-tabs';
import { PublicRaffleCard } from '@/components/raffle/cards/public-card';
import { Button } from '@/components/ui/button';
import { getHostProfile } from '@/services/host/get-host-profile';
import { getHostRaffles } from '@/services/host/get-host-raffles';
import { HOST_ERROR_CODES } from '@/types/errors';
import { RAFFLE_STATUS } from '@/types/raffle';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';

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

// Mirrors the backend `usernameSchema` in
// `raffles-core-backend/src/shared/schemas.ts` (min 3, max 30, alphanumeric +
// underscore). Kept in sync manually — a drift here turns malformed-but-close
// segments into a 400 at the backend, which the host page used to render as a
// generic error and which security ops flagged as a username-format oracle.
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const usernameSchema = z
	.string()
	.min(USERNAME_MIN)
	.max(USERNAME_MAX)
	.regex(/^[a-zA-Z0-9_]+$/);

// Union of the two shapes the backend actually accepts on `/users/:id`.
// `safeParse` against this schema lets the RSC reject impossible segments
// (e.g. `nonexistent-user` with a hyphen) with the same `notFound()` we
// emit for valid-format-but-unknown usernames — making the two
// indistinguishable to an external observer.
const hostIdentifierSchema = z.union([z.uuid(), usernameSchema]);

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

	// Step 1a: Reject segments that can never identify a real host before we
	// touch the backend. This keeps the response for `/host/nonexistent-user`
	// (invalid — hyphen) identical to `/host/nonexistentuser` (valid format,
	// no such user): both 404 via this route's `not-found.tsx`. Without this
	// guard a malformed segment round-trips to the backend, comes back as a
	// 400 `global:validation:invalid-payload`, and falls into the inline
	// error UI — a difference observable as both a distinct screen and a
	// latency delta, i.e. a username-format enumeration oracle.
	if (!hostIdentifierSchema.safeParse(identifier).success) {
		notFound();
	}

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

		// Inline error surface — distinct from `not-found.tsx`, which only
		// triggers on a backend-confirmed NOT_FOUND. Everything else (network,
		// timeout, 5xx, contract drift) lands here so the user can distinguish
		// "this host doesn't exist" from "we couldn't reach the service".
		return (
			<div className="min-h-three-fifths-screen flex w-full flex-col items-center justify-center gap-6 px-4 text-center">
				<BugIcon aria-hidden="true" className="size-20" />
				<hgroup className="flex flex-col gap-2">
					<h2 className="text-foreground text-2xl font-semibold">
						Error loading profile
					</h2>
					<p className="text-muted-foreground max-w-md text-lg">
						Something went wrong while trying to load this host&apos;s profile.
						Please try again in a moment.
					</p>
				</hgroup>
				<Button asChild variant="outline" size="lg">
					<Link href="/browse">Back to Browse</Link>
				</Button>
			</div>
		);
	}

	const host = profileResponse.data;

	if (!rafflesResponse.success) {
		return (
			<div className="container mx-auto w-full max-w-7xl px-4 py-8 lg:min-w-5xl">
				{/* Header Section */}
				<PublicPageHeader />

				<div className="relative mb-8 flex w-full items-center justify-center">
					<Suspense>
						<PublicStatusTabs />
					</Suspense>
				</div>

				{/* Content Section */}
				<div className="flex flex-col gap-8 lg:flex-row">
					<aside className="w-full shrink-0 lg:w-80">
						<HostProfileCard host={host} className="lg:sticky lg:top-24" />
					</aside>

					<main className="flex-1">
						<div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
							<h3 className="text-foreground text-xl font-semibold">
								Error loading sweepstakes
							</h3>
							<p className="text-muted-foreground">Please try again later.</p>
						</div>
					</main>
				</div>
			</div>
		);
	}

	const { raffles } = rafflesResponse.data;

	const emptyMessage = isEnded
		? {
				title: 'No ended sweepstakes',
				description: 'This host has no ended sweepstakes yet.',
			}
		: {
				title: 'No active sweepstakes',
				description: 'This host has no active sweepstakes right now.',
			};

	return (
		<div className="container mx-auto w-full max-w-7xl px-4 py-8 lg:min-w-5xl">
			<PublicPageHeader />

			<div className="relative mb-8 flex w-full items-center justify-center">
				<Suspense fallback={null}>
					<PublicStatusTabs />
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
						<div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
							<h3 className="text-foreground text-xl font-semibold">
								{emptyMessage.title}
							</h3>
							<p className="text-muted-foreground">
								{emptyMessage.description}
							</p>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
