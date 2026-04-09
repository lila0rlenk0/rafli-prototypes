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
