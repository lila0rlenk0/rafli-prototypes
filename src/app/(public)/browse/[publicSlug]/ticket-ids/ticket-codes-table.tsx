import type { TicketCode } from '@/types/ticket';

/**
 * Props for TicketCodesTable
 */
interface TicketCodesTableProps {
	ticketCodes: TicketCode[];
}

/**
 * Renders ticket codes in a table with ticket code and date columns.
 *
 * @returns Table of ticket codes or empty state message
 */
export function TicketCodesTable({ ticketCodes }: TicketCodesTableProps) {
	/**
	 * Formats ISO date to readable format
	 */
	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	if (ticketCodes.length === 0) {
		return (
			<p className="text-muted-foreground py-8 text-center text-sm">
				No tickets yet
			</p>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[400px]">
				<thead>
					<tr className="border-b border-gray-200 text-left text-sm text-gray-500">
						<th className="pb-3 font-medium">#</th>
						<th className="pb-3 font-medium">Ticket Code</th>
						<th className="pb-3 font-medium">Date</th>
					</tr>
				</thead>
				<tbody>
					{ticketCodes.map((ticket, index) => (
						<tr
							key={ticket.ticketCode}
							className="border-b border-gray-100 last:border-0"
						>
							<td className="py-4 text-gray-500">{index + 1}</td>
							<td className="py-4 font-medium">{ticket.ticketCode}</td>
							<td className="py-4 text-black">
								{formatDate(ticket.createdAt)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
