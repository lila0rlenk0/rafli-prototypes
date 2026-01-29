import { getSession } from '@/lib/auth/session';
import { getRaffle } from '@/services/raffle/get-raffle';
import { RAFFLE_STATUS } from '@/types/raffle';
import { notFound, redirect } from 'next/navigation';
import { UpdateForm } from './update-form';
import { UpdateFormProvider } from './update-form-provider';

interface PageProps {
	params: Promise<{
		publicSlug: string;
	}>;
}

/**
 * Create Update Page
 *
 * Allows hosts to post updates for their live raffles.
 * Server-side protected - only accessible by the raffle host when raffle is live.
 * Redirects to /my-raffles if:
 * - Raffle not found
 * - User is not the host
 * - Raffle is not live
 */
export default async function CreateUpdatePage({ params }: PageProps) {
	const { publicSlug } = await params;

	// Get session for ownership verification
	const session = await getSession();
	if (!session?.user?.id) {
		redirect('/my-raffles');
	}

	// Fetch raffle data
	const raffleResult = await getRaffle(publicSlug);
	if (!raffleResult.success) {
		notFound();
	}

	const raffle = raffleResult.data;

	// Verify ownership - only host can post updates
	if (raffle.hostId !== session.user.id) {
		redirect('/my-raffles');
	}

	// Only allow updates for live raffles
	if (raffle.status !== RAFFLE_STATUS.LIVE) {
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
