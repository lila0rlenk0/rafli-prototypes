'use client';

import { Fragment, useState } from 'react';

import type { HostWinnerEntry, WinningStatus } from '@/types/winning';

import { WinnerActionMenu } from './winner-action-menu';
import { WinningStatusBadge } from './winning-status-badge';

interface WinnersTableProps {
	/** Initial list of winners */
	winners: HostWinnerEntry[];
	/** Whether the raffle concluded with partial participation */
	isPartial?: boolean;
	/** Public slug to revalidate host/winner pages after mutations */
	publicSlug: string;
}

/**
 * WinnersTable Component
 *
 * Displays all winners in a table format for host fulfillment management.
 * Supports inline status updates via action menu.
 */
export function WinnersTable({
	winners: initialWinners,
	isPartial,
	publicSlug,
}: WinnersTableProps) {
	const [winners, setWinners] = useState(initialWinners);
	const [expandedWinnerId, setExpandedWinnerId] = useState<string | null>(null);

	/**
	 * Handles status change from action menu
	 */
	function handleStatusChange(winningId: string, newStatus: WinningStatus) {
		setWinners(prev =>
			prev.map(w => (w.id === winningId ? { ...w, status: newStatus } : w)),
		);
	}

	/**
	 * Formats display name: max 2 names, max 20 chars
	 */
	function formatDisplayName(name: string | null, position: number): string {
		if (!name || name.trim().toLowerCase() === 'unknown') {
			return `Winner #${position}`;
		}
		const names = name.trim().split(/\s+/);
		const twoNames = names.slice(0, 2).join(' ');
		return twoNames.length > 20 ? twoNames.slice(0, 17) + '...' : twoNames;
	}

	/**
	 * Gets location from shipping info
	 */
	function getLocation(winner: HostWinnerEntry): string {
		if (!winner.shippingInfo) return 'No address';
		const { city, country } = winner.shippingInfo;
		return `${city}, ${country}`;
	}

	/**
	 * Toggles shipping/contact details panel for a row.
	 * Kept single-open to avoid very tall tables on host dashboards.
	 */
	function toggleExpanded(winningId: string) {
		setExpandedWinnerId(prev => (prev === winningId ? null : winningId));
	}

	if (winners.length === 0) {
		return (
			<div className="rounded-2xl bg-white p-8 text-center">
				<p className="text-gray-500">No winners to display.</p>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-2xl bg-white">
			<table className="w-full">
				<thead>
					<tr className="border-b border-gray-100 text-left text-sm text-gray-500">
						<th className="px-6 py-4 font-medium">#</th>
						<th className="px-6 py-4 font-medium">Winner</th>
						<th className="px-6 py-4 font-medium">Location</th>
						<th className="px-6 py-4 font-medium">Status</th>
						<th className="px-6 py-4 font-medium">
							<span className="sr-only">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100">
					{winners.map(winner => {
						const isExpanded = expandedWinnerId === winner.id;
						const shipping = winner.shippingInfo;

						return (
							<Fragment key={winner.id}>
								<tr className="text-sm">
									<td className="px-6 py-4 font-medium">{winner.position}</td>
									<td className="px-6 py-4">
										{formatDisplayName(winner.userName, winner.position)}
									</td>
									<td className="px-6 py-4 text-gray-500">
										<div className="flex items-center gap-2">
											<span>{getLocation(winner)}</span>
											{shipping && (
												<button
													type="button"
													onClick={() => toggleExpanded(winner.id)}
													className="cursor-pointer text-xs font-semibold text-black underline"
												>
													{isExpanded ? 'Hide details' : 'View details'}
												</button>
											)}
										</div>
									</td>
									<td className="px-6 py-4">
										<WinningStatusBadge
											status={winner.status}
											isPartial={isPartial}
										/>
									</td>
									<td className="px-6 py-4 text-right">
										<WinnerActionMenu
											winner={winner}
											publicSlug={publicSlug}
											onStatusChange={handleStatusChange}
										/>
									</td>
								</tr>

								{isExpanded && shipping && (
									<tr className="bg-gray-50 text-sm">
										<td colSpan={5} className="px-6 py-4">
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												<p>
													<span className="font-semibold">Name:</span>{' '}
													{shipping.name}
												</p>
												<p>
													<span className="font-semibold">Phone:</span>{' '}
													{shipping.phone || 'Not provided'}
												</p>
												<p className="sm:col-span-2">
													<span className="font-semibold">Address:</span>{' '}
													{shipping.address}
												</p>
												<p>
													<span className="font-semibold">City:</span>{' '}
													{shipping.city}
												</p>
												<p>
													<span className="font-semibold">ZIP:</span>{' '}
													{shipping.zip}
												</p>
												<p>
													<span className="font-semibold">Country:</span>{' '}
													{shipping.country}
												</p>
											</div>
										</td>
									</tr>
								)}
							</Fragment>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
