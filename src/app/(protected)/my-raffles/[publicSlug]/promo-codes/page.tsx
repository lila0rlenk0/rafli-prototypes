import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSession } from '@/lib/auth/session';
import { getRaffle } from '@/services/raffle/get-raffle';
import { RAFFLE_STATUS, type RaffleStatus } from '@/types/raffle';

import { PromoCodesContent } from './promo-codes-content';

/**
 * Props for PromoCodesPage
 */
interface PageProps {
	params: Promise<{
		publicSlug: string;
	}>;
}

/**
 * Statuses that allow promo code management (create/deactivate)
 */
const MANAGEABLE_STATUSES: RaffleStatus[] = [
	RAFFLE_STATUS.DRAFT,
	RAFFLE_STATUS.QUEUED,
	RAFFLE_STATUS.LIVE,
];

/**
 * Checks if raffle status allows promo code management
 */
function isManageableStatus(status: RaffleStatus): boolean {
	return MANAGEABLE_STATUSES.includes(status);
}

/**
 * Promo Codes Page
 *
 * Allows hosts to manage promo codes for their raffles.
 * Read-only for ended/completed/cancelled raffles.
 */
export default async function PromoCodesPage({ params }: PageProps) {
	const { publicSlug } = await params;

	// Step 1: Require authenticated session.
	const session = await getSession();
	if (!session?.user?.id) {
		redirect('/my-raffles');
	}

	// Step 2: Fetch raffle data.
	const raffleResult = await getRaffle(publicSlug);
	if (!raffleResult.success) {
		notFound();
	}

	const raffle = raffleResult.data;

	// Step 3: Enforce host-only access.
	if (raffle.hostId !== session.user.id) {
		redirect('/my-raffles');
	}

	const isReadOnly = !isManageableStatus(raffle.status);

	return (
		<div className="container mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8">
			{/* Header */}
			<div className="flex flex-col gap-4">
				<Link
					href={`/browse/${publicSlug}`}
					className="flex w-fit items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
				>
					<ArrowLeft className="size-4" />
					Back to Raffle
				</Link>

				<div>
					<h1 className="text-2xl font-bold text-gray-900">Promo Codes</h1>
					<p className="mt-1 text-sm text-gray-500">{raffle.title}</p>
				</div>
			</div>

			{/* Read-only notice */}
			{isReadOnly && (
				<div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
					This raffle has ended. Promo codes are view-only.
				</div>
			)}

			{/* Main content */}
			<PromoCodesContent
				raffleId={raffle.id}
				publicSlug={publicSlug}
				isReadOnly={isReadOnly}
				allowFreeTickets={!!raffle.questionId}
			/>
		</div>
	);
}
