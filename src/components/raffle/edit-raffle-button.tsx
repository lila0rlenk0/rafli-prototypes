'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface EditRaffleButtonProps {
	raffleId: string;
}

/**
 * EditRaffleButton Component
 *
 * Displays an "Edit Raffle" button for draft/queued raffles.
 * Links to the edit page for the raffle.
 */
export function EditRaffleButton({ raffleId }: EditRaffleButtonProps) {
	return (
		<Link href={`/my-raffles/${raffleId}/edit`}>
			<Button variant="outline" className="flex w-full items-center gap-2">
				<Pencil className="size-4" />
				Edit Raffle
			</Button>
		</Link>
	);
}
