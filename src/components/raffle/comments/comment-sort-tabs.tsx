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
 * Uses `<span role="tab">` instead of `<button>` because this component
 * renders inside AccordionTrigger (a `<button>`) — nested buttons are
 * invalid HTML and trigger React hydration warnings.
 *
 * @param sort - Currently active sort option
 * @param onSort - Callback when sort changes
 */
export function CommentSortTabs({ sort, onSort }: CommentSortTabsProps) {
	return (
		<div className="flex gap-1" role="tablist">
			{SORT_OPTIONS.map(option => (
				<span
					key={option.value}
					role="tab"
					tabIndex={0}
					aria-selected={sort === option.value}
					onClick={function handleSort() {
						onSort(option.value);
					}}
					onKeyDown={function handleKeyDown(e) {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onSort(option.value);
						}
					}}
					className={cn(
						'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors select-none',
						sort === option.value
							? 'bg-black text-white'
							: 'bg-transparent text-gray-500 hover:text-gray-700',
					)}
				>
					{option.label}
				</span>
			))}
		</div>
	);
}
