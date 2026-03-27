'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import type { Category } from '@/types/category';
import { RAFFLE_SORT_OPTION } from '@/types/raffle';
import { FilterSelect, type FilterOption } from './filter-select';

// ==========================================
// Filter Options
// ==========================================

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

	/**
	 * Transforms categories into filter options format
	 * Includes "All Categories" as the first option
	 */
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

	/**
	 * Updates the URL with new filter parameters
	 */
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

	/**
	 * Handles category filter change
	 */
	function handleCategoryChange(value: string): void {
		updateFilters('category', value);
	}

	/**
	 * Handles sort option change
	 */
	function handleSortChange(value: string): void {
		updateFilters('sort', value);
	}

	return (
		<div className="flex items-center gap-4">
			{/* Filters Label */}
			<p className="text-sm leading-6 font-semibold text-[#182135]">Filters</p>

			{/* Category Filter */}
			<FilterSelect
				options={categoryOptions}
				value={category}
				onValueChange={handleCategoryChange}
				placeholder="All Categories"
			/>

			{/* Sort Filter */}
			<FilterSelect
				options={SORT_OPTIONS}
				value={sort}
				onValueChange={handleSortChange}
				placeholder="Newest"
			/>
		</div>
	);
}
