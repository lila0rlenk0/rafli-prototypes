import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSession } from '@/lib/auth/session';
import { getRaffle } from '@/services/raffle/get-raffle';
import {
	PROMO_MANAGEABLE_STATUSES,
	type PromoManageableStatus,
} from '@/types/raffle';

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
 * Promo Codes Page
 *
 * Allows hosts to manage promo codes for their raffles.
 * Read-only for ended/completed/cancelled raffles.
 */
export default async function PromoCodesPage({ params }: PageProps) {
	const { publicSlug } = await params;

	/**
	 * Checks if raffle status allows promo code management
	 */
	function isManageableStatus(status: string): boolean {
		return PROMO_MANAGEABLE_STATUSES.includes(status as PromoManageableStatus);
	}

	// Parallel fetch — session and raffle are independent
	const [session, raffleResult] = await Promise.all([
		getSession(),
		getRaffle(publicSlug),
	]);

	if (!session?.user?.id) {
		redirect('/my-raffles');
	}

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
					className="flex w-fit items-center gap-2"
				>
					<ArrowLeft className="size-4" />
					<span className="font-semibold">Back to Raffle</span>
				</Link>

				<div>
					<h1 className="font-clash-display text-2xl font-bold">
						Manage promo codes
					</h1>
					<p className="mt-1 text-sm">
						Create different promo code types to attract new participants or
						reward your community.
					</p>
				</div>
			</div>

			{/* Read-only notice */}
			{isReadOnly ? (
				<div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
					This raffle has ended. Promo codes are view-only.
				</div>
			) : null}

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
