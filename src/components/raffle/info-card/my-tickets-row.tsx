'use client';

import { InfoIcon } from 'lucide-react';
import Link from 'next/link';

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TicketCode } from '@/types/ticket';

const MAX_VISIBLE_TICKETS = 5;

interface MyTicketsRowProps {
	myTicketCodes: TicketCode[];
	myTicketsTotal: number;
	publicSlug: string;
}

/**
 * Authenticated-only row that displays the viewer's ticket count and,
 * when non-zero, a tooltip showing up to five ticket codes with a "+N
 * more" overflow indicator. The tooltip's trigger links to the full list
 * page so keyboard users always have a non-hover path.
 */
export function MyTicketsRow({
	myTicketCodes,
	myTicketsTotal,
	publicSlug,
}: MyTicketsRowProps) {
	return (
		<div className="flex items-center justify-between">
			<h3 className="text-ink-500 text-sm font-medium">My Entries</h3>
			<div className="flex items-center gap-2">
				<p>{myTicketsTotal.toLocaleString('en-US')}</p>
				{myTicketsTotal > 0 ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Link
								href={`/browse/${publicSlug}/ticket-ids`}
								aria-label="View entry codes"
							>
								<InfoIcon className="text-ink-500 size-5" />
							</Link>
						</TooltipTrigger>
						<TooltipContent
							side="left"
							className="flex max-w-64 flex-col gap-1 p-3"
						>
							<p className="mb-2 text-xs font-semibold">Your entry codes</p>
							{myTicketCodes.slice(0, MAX_VISIBLE_TICKETS).map(ticket => (
								<span
									key={ticket.ticketCode}
									className="mr-1 inline-block rounded bg-yellow-200 px-2 py-0.5 text-xs font-medium text-black"
								>
									{ticket.ticketCode}
								</span>
							))}
							{myTicketsTotal > MAX_VISIBLE_TICKETS ? (
								<p className="text-ink-500 mt-1 text-xs">
									+{myTicketsTotal - MAX_VISIBLE_TICKETS} more
								</p>
							) : null}
						</TooltipContent>
					</Tooltip>
				) : null}
			</div>
		</div>
	);
}
