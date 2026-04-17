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
export function normalizeSubmissionsFilterValue(
	value: string | null,
	allowed: readonly string[],
): string {
	if (!value) return 'all';
	// Normalize unknown query values to "all" so Select stays controlled.
	return allowed.includes(value) ? value : 'all';
}

export function SubmissionsFilters() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const currentStatus = normalizeSubmissionsFilterValue(
		searchParams.get('status'),
		['all', 'pending', 'approved', 'rejected'],
	);
	const currentType = normalizeSubmissionsFilterValue(
		searchParams.get('type'),
		['all', 'kyb_individual', 'kyb_company', 'kyc_winner'],
	);

	/**
	 * Updates a single search param, clears page — prevents landing on empty pages
	 * when the filtered result count is lower than the current offset.
	 */
	function updateParam(key: string, value: string) {
		const params = new URLSearchParams(searchParams.toString());

		if (value === 'all') {
			params.delete(key);
		} else {
			params.set(key, value);
		}

		params.delete('page');

		router.push(`/admin/verification?${params.toString()}`);
	}

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<Select
				value={currentStatus}
				onValueChange={value => updateParam('status', value)}
			>
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

			<Select
				value={currentType}
				onValueChange={value => updateParam('type', value)}
			>
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
