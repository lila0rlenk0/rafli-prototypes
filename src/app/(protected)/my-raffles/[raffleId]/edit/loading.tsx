import { Spinner } from '@/components/ui/spinner';

/**
 * Loading state for edit raffle page
 */
export default function EditRaffleLoading() {
	return (
		<div className="flex h-[60vh] w-full items-center justify-center">
			<Spinner />
		</div>
	);
}
