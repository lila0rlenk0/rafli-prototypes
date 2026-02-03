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
	 * Formats display name: max 2 names, max 20 chars
	 */
	function formatDisplayName(name: string | null, position: number): string {
		if (!name) return `Winner #${position}`;
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
							<td className="px-6 py-4">
								{formatDisplayName(winner.userName, winner.position)}
							</td>
							<td className="px-6 py-4 text-gray-500">
								{getLocation(winner)}
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
