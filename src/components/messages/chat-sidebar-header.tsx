'use client';

import { ArrowDownWideNarrow, Search, X } from 'lucide-react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { type ConversationFilter, type ConversationSort } from '@/types/chat';

import { chatListFilterLabel, chatListSortLabel } from './chat-utils';

interface ChatSidebarHeaderProps {
	readonly search: string;
	readonly onSearchChange: (next: string) => void;
	readonly filter: ConversationFilter;
	readonly onFilterChange: (next: ConversationFilter) => void;
	readonly sort: ConversationSort;
	readonly onSortChange: (next: ConversationSort) => void;
	/** Per-filter counts — rendered as small badges on each chip. */
	readonly counts: Readonly<Record<ConversationFilter, number>>;
	/** `true` while the counts endpoint is inflight — tames badge flicker. */
	readonly countsLoading?: boolean;
}

const FILTER_ORDER: readonly ConversationFilter[] = [
	'all',
	'unread',
	'winners',
	'raffles',
];

const SORT_ORDER: readonly ConversationSort[] = [
	'recent',
	'unread_first',
	'oldest',
];

/**
 * Sidebar header: title + search + filter chips + sort. Kept presentational —
 * all state lives in the parent so the header rerenders only when the
 * controlled inputs change.
 */
export function ChatSidebarHeader({
	search,
	onSearchChange,
	filter,
	onFilterChange,
	sort,
	onSortChange,
	counts,
	countsLoading = false,
}: ChatSidebarHeaderProps) {
	const searchInputId = useId();

	function handleClearSearch() {
		onSearchChange('');
	}

	return (
		<header className="bg-background flex flex-col gap-3 border-b p-3">
			<div className="flex items-center justify-between gap-2">
				<h1 className="text-sm font-semibold">Chats</h1>
				<SortMenu sort={sort} onSortChange={onSortChange} />
			</div>

			{/* Search — aria-label + role="search" wrapper to let screen readers
			    announce the region. `min-w-0` on the wrapper keeps the input
			    from forcing horizontal scroll when the sidebar narrows. */}
			<div
				role="search"
				aria-label="Search chats"
				className="relative flex min-w-0 items-center"
			>
				<Search
					aria-hidden
					className="text-muted-foreground pointer-events-none absolute start-3 size-3.5"
				/>
				<Input
					id={searchInputId}
					type="search"
					inputMode="search"
					// Browser autocomplete interferes with custom search inputs —
					// disable so the list stays in sync with what the user sees.
					autoComplete="off"
					spellCheck={false}
					value={search}
					onChange={event => onSearchChange(event.target.value)}
					placeholder="Search by raffle, winner, email, or id"
					aria-label="Search by raffle, winner, email, or id"
					className="h-9 min-w-0 ps-8 pe-8 text-sm"
				/>
				{search ? (
					<button
						type="button"
						onClick={handleClearSearch}
						aria-label="Clear search"
						className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute end-2 inline-flex size-5 items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-none"
					>
						<X aria-hidden className="size-3.5" />
					</button>
				) : null}
			</div>

			{/* Filter chips — `role="group"` (not `tablist`) because the body
			    below is a filtered list, not a tabpanel; screen readers
			    announcing these as tabs would promise a `tabpanel` relationship
			    we don't fulfil. Horizontal scroll keeps long German labels
			    ("Gewinner") readable on narrow viewports without wrapping. */}
			<div
				role="group"
				aria-label="Filter chats"
				className="scrollbar-none flex min-w-0 gap-2 overflow-x-auto"
			>
				{FILTER_ORDER.map(item => {
					const count = counts[item];
					const isActive = filter === item;
					return (
						<button
							key={item}
							type="button"
							aria-pressed={isActive}
							onClick={() => onFilterChange(item)}
							className={cn(
								'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
								'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
								isActive
									? 'bg-primary text-primary-foreground border-transparent'
									: 'text-muted-foreground hover:bg-muted border-border bg-transparent',
							)}
						>
							<span className="truncate">{chatListFilterLabel(item)}</span>
							{count > 0 ? (
								<span
									className={cn(
										'inline-flex min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] tabular-nums transition-opacity',
										// Keep the old value visible at half opacity while the
										// counts endpoint is refetching — prevents the badge
										// from flickering to 0 when the user starts typing.
										countsLoading ? 'opacity-60' : 'opacity-100',
										isActive
											? 'bg-primary-foreground/20 text-primary-foreground'
											: 'bg-muted text-muted-foreground',
									)}
									aria-hidden
								>
									{count > 99 ? '99+' : count}
								</span>
							) : null}
						</button>
					);
				})}
			</div>
		</header>
	);
}

interface SortMenuProps {
	readonly sort: ConversationSort;
	readonly onSortChange: (next: ConversationSort) => void;
}

function SortMenu({ sort, onSortChange }: SortMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 gap-1 px-2 text-xs"
					aria-label={`Sort chats: ${chatListSortLabel(sort)}`}
				>
					<ArrowDownWideNarrow aria-hidden className="size-3.5" />
					<span className="truncate">{chatListSortLabel(sort)}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-44">
				<div className="text-muted-foreground px-2 py-1.5 text-[11px] font-medium">
					Sort by
				</div>
				<DropdownMenuSeparator />
				{SORT_ORDER.map(option => (
					<DropdownMenuItem
						key={option}
						onSelect={() => onSortChange(option)}
						className={cn(
							'text-xs',
							option === sort ? 'bg-muted font-medium' : null,
						)}
					>
						{chatListSortLabel(option)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
