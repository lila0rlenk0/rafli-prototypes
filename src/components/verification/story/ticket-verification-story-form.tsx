'use client';

import { Search } from 'lucide-react';
import type { SyntheticEvent } from 'react';

import { cn } from '@/lib/class-names';

export interface TicketVerificationStoryFormProps {
	raffleSlug: string;
	ticketCode: string;
	onRaffleSlugChange: (value: string) => void;
	onTicketCodeChange: (value: string) => void;
	onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
}

export function TicketVerificationStoryForm({
	raffleSlug,
	ticketCode,
	onRaffleSlugChange,
	onTicketCodeChange,
	onSubmit,
}: TicketVerificationStoryFormProps) {
	const canSubmit =
		raffleSlug.trim().length > 0 && ticketCode.trim().length > 0;

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-4">
			<div>
				<label htmlFor="hiw-raffle" className="mb-1 block text-sm font-medium">
					Sweepstakes ID or Slug
				</label>
				<input
					id="hiw-raffle"
					type="text"
					value={raffleSlug}
					onChange={e => onRaffleSlugChange(e.target.value)}
					placeholder="e.g., my-sweepstakes or sweepstakes_abc123"
					className="border-input focus:border-ring focus:ring-ring/50 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none"
				/>
				<p className="text-muted-foreground mt-1 text-xs">
					Found in the sweepstakes URL
				</p>
			</div>

			<div>
				<label htmlFor="hiw-ticket" className="mb-1 block text-sm font-medium">
					Entry Code
				</label>
				<input
					id="hiw-ticket"
					type="text"
					value={ticketCode}
					onChange={e => onTicketCodeChange(e.target.value)}
					placeholder="e.g., TKT-1234-ABCDEF"
					className="border-input focus:border-ring focus:ring-ring/50 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none"
				/>
			</div>

			<button
				type="submit"
				disabled={!canSubmit}
				className={cn(
					'bg-brand-dark border-brand-dark flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold text-white transition-colors',
					canSubmit
						? 'hover:text-brand-dark hover:bg-white'
						: 'cursor-not-allowed opacity-50',
				)}
			>
				<Search className="size-4" />
				Verify Entry
			</button>
		</form>
	);
}
