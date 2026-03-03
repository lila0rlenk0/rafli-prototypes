'use client';

import { COMMENT_SORT, type CommentSort } from '@/types/comment';

import { cn } from '@/lib/utils';

interface CommentSortTabsProps {
	sort: CommentSort;
	onSort: (sort: CommentSort) => void;
}

/** All sort options with display labels */
const SORT_OPTIONS: { value: CommentSort; label: string }[] = [
	{ value: COMMENT_SORT.NEWEST, label: 'Newest' },
	{ value: COMMENT_SORT.TOP, label: 'Top' },
	{ value: COMMENT_SORT.OLDEST, label: 'Oldest' },
];

/**
 * Sort tabs for comment section
 *
 * Pill-style buttons: active = black/white, inactive = transparent/gray.
 * Matches the tab pattern used in other filter UIs.
 *
 * @param sort - Currently active sort option
 * @param onSort - Callback when sort changes
 */
export function CommentSortTabs({ sort, onSort }: CommentSortTabsProps) {
	return (
		<div className="flex gap-1">
			{SORT_OPTIONS.map(option => (
				<button
					key={option.value}
					type="button"
					onClick={function handleSort() {
						onSort(option.value);
					}}
					className={cn(
						'rounded-full px-3 py-1 text-xs font-medium transition-colors',
						sort === option.value
							? 'bg-black text-white'
							: 'bg-transparent text-gray-500 hover:text-gray-700',
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
