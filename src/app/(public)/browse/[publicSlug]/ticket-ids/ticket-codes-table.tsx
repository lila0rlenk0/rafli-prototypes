import { ExternalLink } from 'lucide-react';

import type { TicketCode } from '@/types/ticket';

// =============================================================================
// TYPES
// =============================================================================

interface TicketCodesTableProps {
	ticketCodes: TicketCode[];
}

// =============================================================================
// SOURCE LABELS
// =============================================================================

/**
 * Maps backend source values to user-friendly labels.
 * Backend sources: 'purchase', 'promo', 'x_share', 'wallet', 'partner:{id}'.
 */
function getSourceLabel(source: string): string {
	if (source === 'purchase') return 'Purchased';
	if (source === 'promo') return 'Promo code';
	if (source === 'x_share') return 'Shared on X';
	if (source === 'wallet') return 'Crypto payment';
	// Partner sources use 'partner:{configId}' format — strip the ID for display
	if (source.startsWith('partner:')) return 'Partner reward';
	// Fallback for any future source types
	return 'Bonus';
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders ticket codes in a table with ticket code, source, and date columns.
 * Source column shows friendly labels with optional receipt links (Stripe, block explorer).
 */
export function TicketCodesTable({ ticketCodes }: TicketCodesTableProps) {
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
			<table className="w-full min-w-[500px]">
				<thead>
					<tr className="border-b border-gray-200 text-left text-sm text-gray-500">
						<th className="pb-3 font-medium">#</th>
						<th className="pb-3 font-medium">Ticket Code</th>
						<th className="pb-3 font-medium">Source</th>
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
							<td className="py-4">
								<SourceCell
									source={ticket.source}
									receiptUrl={ticket.receiptUrl}
								/>
							</td>
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

// =============================================================================
// SOURCE CELL
// =============================================================================

/**
 * Renders the source label with an optional external receipt link.
 * Links open in a new tab — Stripe receipt pages and block explorer tx pages.
 */
function SourceCell({
	source,
	receiptUrl,
}: {
	source: string;
	receiptUrl: null | string;
}) {
	const label = getSourceLabel(source);

	if (!receiptUrl) {
		return <span className="text-gray-600">{label}</span>;
	}

	return (
		<a
			href={receiptUrl}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
		>
			{label}
			<ExternalLink className="size-3" />
		</a>
	);
}
