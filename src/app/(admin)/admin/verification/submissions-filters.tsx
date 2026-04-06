'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

/**
 * SubmissionsFilters Component
 *
 * Status and verification type filter dropdowns for the admin submissions list.
 * Updates URL search params — the server component re-fetches on param change.
 *
 * @returns Filter row with two Select dropdowns
 */
export function SubmissionsFilters() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const currentStatus = searchParams.get('status') ?? 'all';
	const currentType = searchParams.get('type') ?? 'all';

	/**
	 * Updates a single search param while preserving others.
	 * Resets page to 1 when filters change — prevents showing
	 * an empty page if the filtered results are fewer.
	 */
	function updateParam(key: string, value: string) {
		const params = new URLSearchParams(searchParams.toString());

		if (value === 'all') {
			params.delete(key);
		} else {
			params.set(key, value);
		}

		// Reset to first page on filter change
		params.delete('page');

		router.push(`/admin/verification?${params.toString()}`);
	}

	function handleStatusChange(value: string) {
		updateParam('status', value);
	}

	function handleTypeChange(value: string) {
		updateParam('type', value);
	}

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
			{/* Status filter */}
			<Select value={currentStatus} onValueChange={handleStatusChange}>
				<SelectTrigger className="w-full sm:w-40">
					<SelectValue placeholder="All statuses" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All statuses</SelectItem>
					<SelectItem value="pending">Pending</SelectItem>
					<SelectItem value="approved">Approved</SelectItem>
					<SelectItem value="rejected">Rejected</SelectItem>
				</SelectContent>
			</Select>

			{/* Verification type filter */}
			<Select value={currentType} onValueChange={handleTypeChange}>
				<SelectTrigger className="w-full sm:w-48">
					<SelectValue placeholder="All types" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All types</SelectItem>
					<SelectItem value="kyb_individual">Individual Host</SelectItem>
					<SelectItem value="kyb_company">Company Host</SelectItem>
					<SelectItem value="kyc_winner">Raffle Winner</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
