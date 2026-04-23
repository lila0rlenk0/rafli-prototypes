'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface EditRaffleButtonProps {
	publicSlug: string;
}

export function EditRaffleButton({ publicSlug }: EditRaffleButtonProps) {
	return (
		<Link href={`/my-raffles/${publicSlug}/edit`}>
			<Button className="hover:bg-background flex w-full cursor-pointer items-center gap-2 border-2 border-black bg-black transition-colors duration-150 hover:text-black">
				<Pencil className="size-4" />
				Edit Sweepstakes
			</Button>
		</Link>
	);
}
