import { getSession } from '@/lib/auth/session';
import { getRaffle } from '@/services/raffle/get-raffle';
import {
	UPDATE_MANAGEABLE_STATUSES,
	type UpdateManageableStatus,
} from '@/types/raffle';
import { notFound, redirect } from 'next/navigation';
import { UpdateForm } from '@/components/my-raffles/update/form';
import { UpdateFormProvider } from '@/components/my-raffles/update/form-provider';

interface PageProps {
	params: Promise<{
		publicSlug: string;
	}>;
}

/**
 * Create Update Page (Server Component)
 *
 * Data-fetching strategy: parallel session + raffle fetch for authorization.
 * Update form is fully client-side — no server data beyond the raffle ID.
 *
 * Server-side protected — only accessible by raffle host in update-manageable statuses.
 * Redirects to /my-raffles if unauthorized or wrong status, 404 if not found.
 */
export default async function CreateUpdatePage({ params }: PageProps) {
	const { publicSlug } = await params;

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

	if (raffle.hostId !== session.user.id) {
		redirect('/my-raffles');
	}

	// Only allow updates for statuses where host communication is still meaningful
	if (
		!UPDATE_MANAGEABLE_STATUSES.includes(
			raffle.status as UpdateManageableStatus,
		)
	) {
		redirect('/my-raffles');
	}

	return (
		<div className="container mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-8">
			<UpdateFormProvider raffleId={raffle.id} publicSlug={publicSlug}>
				<UpdateForm />
			</UpdateFormProvider>
		</div>
	);
}
