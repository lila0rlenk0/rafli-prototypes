'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import type { Category } from '@/types/category';
import { RAFFLE_SORT_OPTION } from '@/types/raffle';
import { FilterSelect, type FilterOption } from './filter-select';

const SORT_OPTIONS: readonly FilterOption[] = [
	{ value: RAFFLE_SORT_OPTION.NEWEST, label: 'Newest' },
	{ value: RAFFLE_SORT_OPTION.ENDING_SOON, label: 'Ending Soon' },
	{ value: RAFFLE_SORT_OPTION.LOWEST_PRICE, label: 'Lowest Price' },
] as const;

interface FilterBarProps {
	categories: Category[];
}

/**
 * FilterBar Component
 *
 * Displays filter controls for browsing raffles including category
 * and sort options. Updates URL search params when filters change.
 *
 * @param categories - List of available categories from the backend
 */
export function FilterBar({ categories }: FilterBarProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const category = searchParams.get('category') ?? '';
	const sort = searchParams.get('sort') ?? RAFFLE_SORT_OPTION.NEWEST;

	// useMemo: avoids rebuilding category option list on every render.
	// Only recalculates when the categories array reference changes (prop from server).
	const categoryOptions = useMemo(
		(): FilterOption[] => [
			{ value: '', label: 'All Categories' },
			...categories.map(cat => ({
				value: cat.id,
				label: cat.name,
			})),
		],
		[categories],
	);

	function updateFilters(key: string, value: string): void {
		const params = new URLSearchParams(searchParams);

		if (value) {
			params.set(key, value);
		} else {
			params.delete(key);
		}

		// Reset to page 1 when filters change
		params.delete('page');

		router.push(`${pathname}?${params.toString()}`);
	}

	function handleCategoryChange(value: string): void {
		track(RAFFLE_EVENTS.FILTERED, {
			filter_type: 'category',
			category: value || 'all',
			sort,
		});
		updateFilters('category', value);
	}

	function handleSortChange(value: string): void {
		track(RAFFLE_EVENTS.FILTERED, {
			filter_type: 'sort',
			category: category || 'all',
			sort: value,
		});
		updateFilters('sort', value);
	}

	return (
		<div className="flex items-center gap-4">
			<p className="text-sm leading-6 font-semibold text-[#182135]">Filters</p>

			<FilterSelect
				options={categoryOptions}
				value={category}
				onValueChange={handleCategoryChange}
				placeholder="All Categories"
			/>

			<FilterSelect
				options={SORT_OPTIONS}
				value={sort}
				onValueChange={handleSortChange}
				placeholder="Newest"
			/>
		</div>
	);
}
