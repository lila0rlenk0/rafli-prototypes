'use client';

import { useState } from 'react';

import type { HostWinnerEntry, WinningStatus } from '@/types/winning';

import { WinnerActionMenu } from './winner-action-menu';
import { WinningStatusBadge } from './winning-status-badge';

interface WinnersTableProps {
	/** Initial list of winners */
	winners: HostWinnerEntry[];
}

/**
 * WinnersTable Component
 *
 * Displays all winners in a table format for host fulfillment management.
 * Supports inline status updates via action menu.
 */
export function WinnersTable({ winners: initialWinners }: WinnersTableProps) {
	const [winners, setWinners] = useState(initialWinners);

	/**
	 * Handles status change from action menu
	 */
	function handleStatusChange(winningId: string, newStatus: WinningStatus) {
		setWinners(prev =>
			prev.map(w => (w.id === winningId ? { ...w, status: newStatus } : w)),
		);
	}

	/**
	 * Gets display name for a winner
	 */
	function getDisplayName(winner: HostWinnerEntry): string {
		return winner.userName ?? `Winner #${winner.position}`;
	}

	/**
	 * Gets shipping status text
	 */
	function getShippingStatus(winner: HostWinnerEntry): string {
		if (!winner.shippingInfo) return 'No address';
		return winner.shippingInfo.city;
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
					{winners.map(winner => (
						<tr key={winner.id} className="text-sm">
							<td className="px-6 py-4 font-medium">{winner.position}</td>
							<td className="px-6 py-4">{getDisplayName(winner)}</td>
							<td className="px-6 py-4 text-gray-500">
								{getShippingStatus(winner)}
							</td>
							<td className="px-6 py-4">
								<WinningStatusBadge status={winner.status} />
							</td>
							<td className="px-6 py-4 text-right">
								<WinnerActionMenu
									winner={winner}
									onStatusChange={handleStatusChange}
								/>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
