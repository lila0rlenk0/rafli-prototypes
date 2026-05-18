import { ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import type { TicketCode } from '@/types/ticket';

// =============================================================================
// TYPES
// =============================================================================

interface TicketCodesTableProps {
	ticketCodes: TicketCode[];
	/**
	 * Raffle public slug — used to build verify links for each row.
	 * Route params already expose this on the parent page, so we pass it
	 * down rather than re-deriving from the TicketCode (which only has UUID).
	 */
	raffleSlug: string;
	/**
	 * Whether the "Verify" column is shown. Gated on raffle status — only
	 * `fulfilling` and `completed` have a published merkle manifest that the
	 * verify endpoint can actually check. `ended` is excluded because VRF is
	 * still in flight and the backend would reject the request.
	 */
	canVerify: boolean;
}

interface SourceCellProps {
	source: string;
	receiptUrl: null | string;
}

interface VerifyCellProps {
	raffleSlug: string;
	ticketCode: string;
}

// =============================================================================
// SOURCE LABELS
// =============================================================================

/**
 * Maps backend source values to user-friendly labels.
 * Backend sources: 'purchase', 'promo', 'subscription', 'x_share', 'wallet', 'partner:{id}'.
 */
function getSourceLabel(source: string): string {
	if (source === 'purchase') return 'Purchased';
	if (source === 'promo') return 'Promo code';
	if (source === 'subscription') return 'Subscription perk';
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
 * When `canVerify` is true, adds a trailing "Verify" column linking each ticket
 * to `/verify` with the raffle slug and ticket code pre-filled as query params.
 */
export function TicketCodesTable({
	ticketCodes,
	raffleSlug,
	canVerify,
}: TicketCodesTableProps) {
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
				No entries yet
			</p>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-125">
				<thead>
					<tr className="border-b border-gray-200 text-left text-sm text-gray-500">
						<th className="pb-3 font-medium">#</th>
						<th className="pb-3 font-medium">Entry Code</th>
						<th className="pb-3 font-medium">Source</th>
						<th className="pb-3 font-medium">Date</th>
						{canVerify ? <th className="pb-3 font-medium">Verify</th> : null}
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
							{canVerify ? (
								<td className="py-4">
									<VerifyCell
										raffleSlug={raffleSlug}
										ticketCode={ticket.ticketCode}
									/>
								</td>
							) : null}
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
function SourceCell({ source, receiptUrl }: SourceCellProps) {
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

// =============================================================================
// VERIFY CELL
// =============================================================================

/**
 * Renders a "Verify" link that navigates to /verify with the raffle slug and
 * ticket code pre-filled as query params. The verify page reads these on the
 * server and seeds the EnhancedTicketChecker form, so the user can submit
 * immediately without retyping.
 *
 * `encodeURIComponent` is belt-and-suspenders — current slug and ticket code
 * formats are URL-safe, but the encoding protects against any future format
 * that introduces special characters.
 */
function VerifyCell({ raffleSlug, ticketCode }: VerifyCellProps) {
	const href = `/verify?raffle=${encodeURIComponent(raffleSlug)}&code=${encodeURIComponent(ticketCode)}`;

	return (
		<Link
			href={href}
			className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
		>
			<ShieldCheck className="size-3.5" />
			Verify
		</Link>
	);
}
