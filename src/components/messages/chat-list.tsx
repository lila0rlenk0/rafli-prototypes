'use client';

import { Inbox, Loader2, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useConversationCounts } from '@/services/chat/use-conversation-counts';
import { useConversations } from '@/services/chat/use-conversations';
import type {
	Conversation,
	ConversationFilter,
	ConversationSort,
} from '@/types/chat';

import { ChatListItem } from './chat-list-item';
import { ChatSidebarHeader } from './chat-sidebar-header';

interface ChatListProps {
	readonly viewerId: string;
	readonly selectedConversationId?: string;
	/** Base URL for conversation deep links — parent provides so admin + user layouts can share the list. */
	readonly hrefBase: string;
}

/**
 * Debounce window on the search input. Below 250ms the backend sees a flurry
 * of per-keystroke requests; above ~350ms the input feels laggy. 300ms is a
 * boring compromise that keeps the backend honest and the UI responsive.
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Conversation sidebar. Filter / search / sort are fully server-driven: the
 * hook forwards `q`, `filter`, `sort` to the backend and the backend runs
 * keyset pagination per sort. Slicing client-side would corrupt cursor
 * boundaries and give the user inconsistent page sizes.
 */
export function ChatList({
	viewerId,
	selectedConversationId,
	hrefBase,
}: ChatListProps) {
	// Raw input keeps typing instant; `debouncedSearch` is what the backend
	// actually sees, avoiding one query per keystroke.
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [filter, setFilter] = useState<ConversationFilter>('all');
	const [sort, setSort] = useState<ConversationSort>('recent');

	useEffect(() => {
		const handle = window.setTimeout(() => {
			setDebouncedSearch(search);
		}, SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(handle);
	}, [search]);

	// Empty-string means "no search" — normalise here so the query cache key
	// is stable (the hook coerces empty/undefined to the same bucket).
	const trimmedQuery = debouncedSearch.trim();
	const effectiveQuery = trimmedQuery.length > 0 ? trimmedQuery : undefined;

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isFetching,
		error,
	} = useConversations({ q: effectiveQuery, filter, sort });

	const countsQuery = useConversationCounts({ q: effectiveQuery });

	const conversations = useMemo<readonly Conversation[]>(() => {
		if (!data) return [];
		return data.pages.flatMap(page => page.conversations);
	}, [data]);

	// Counts fall back to zeros while the first fetch is in-flight so the
	// badges don't render stale values from a prior view.
	const counts: Readonly<Record<ConversationFilter, number>> =
		countsQuery.data ?? {
			all: 0,
			unread: 0,
			winners: 0,
			raffles: 0,
		};

	const hasQueryOrFilter = !!effectiveQuery || filter !== 'all';

	function handleResetFilters() {
		setSearch('');
		setDebouncedSearch('');
		setFilter('all');
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<ChatSidebarHeader
				search={search}
				onSearchChange={setSearch}
				filter={filter}
				onFilterChange={setFilter}
				sort={sort}
				onSortChange={setSort}
				counts={counts}
				countsLoading={countsQuery.isFetching}
			/>

			<div className="flex-1 overflow-y-auto">
				<ChatListBody
					isLoading={isLoading}
					isRefetching={isFetching && !isLoading && !isFetchingNextPage}
					hasError={!!error}
					conversations={conversations}
					viewerId={viewerId}
					selectedConversationId={selectedConversationId}
					hrefBase={hrefBase}
					hasQueryOrFilter={hasQueryOrFilter}
					onResetFilters={handleResetFilters}
				/>
			</div>

			{hasNextPage ? (
				<div className="border-t p-3">
					<Button
						variant="ghost"
						size="sm"
						className="w-full"
						onClick={() => fetchNextPage()}
						disabled={isFetchingNextPage}
					>
						{isFetchingNextPage ? (
							<>
								<Loader2 className="mr-2 size-3 animate-spin" />
								Loading…
							</>
						) : (
							'Load more'
						)}
					</Button>
				</div>
			) : null}
		</div>
	);
}

interface ChatListBodyProps {
	readonly isLoading: boolean;
	readonly isRefetching: boolean;
	readonly hasError: boolean;
	readonly conversations: readonly Conversation[];
	readonly viewerId: string;
	readonly selectedConversationId?: string;
	readonly hrefBase: string;
	readonly hasQueryOrFilter: boolean;
	readonly onResetFilters: () => void;
}

/**
 * Body of the sidebar: loading / error / zero-data first-run / zero-match
 * after filter / populated list. Split out of the parent so the header keeps
 * focus on the search input while the body swaps between states.
 */
function ChatListBody({
	isLoading,
	isRefetching,
	hasError,
	conversations,
	viewerId,
	selectedConversationId,
	hrefBase,
	hasQueryOrFilter,
	onResetFilters,
}: ChatListBodyProps) {
	if (isLoading) {
		return (
			<div className="text-muted-foreground flex h-full items-center justify-center gap-2 p-6 text-sm">
				<Loader2 className="size-4 animate-spin" />
				<span>Loading conversations…</span>
			</div>
		);
	}

	if (hasError) {
		return (
			<div
				role="alert"
				className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm"
			>
				<p>Couldn’t load your conversations.</p>
				<p className="text-xs">Refresh the page to retry.</p>
			</div>
		);
	}

	if (conversations.length === 0) {
		// Distinguish first-run zero-data from "no matches for the current
		// filter" — both render empty, but the recovery action differs.
		if (hasQueryOrFilter) {
			return (
				<div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm">
					<div className="bg-muted text-foreground/70 flex size-10 items-center justify-center rounded-full">
						<SearchX className="size-5" aria-hidden />
					</div>
					<div className="flex max-w-[14rem] flex-col gap-1">
						<p className="text-foreground font-semibold">No matches</p>
						<p className="leading-relaxed">
							No conversations match the current filters.
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={onResetFilters}
						className="mt-1"
					>
						Clear filters
					</Button>
				</div>
			);
		}

		return (
			<div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm">
				<div className="bg-muted text-foreground/70 flex size-10 items-center justify-center rounded-full">
					<Inbox className="size-5" aria-hidden />
				</div>
				<div className="flex max-w-[14rem] flex-col gap-1">
					<p className="text-foreground font-semibold">No conversations yet</p>
					<p className="leading-relaxed">
						A chat opens here automatically the moment you win a raffle or
						someone wins one of yours.
					</p>
				</div>
			</div>
		);
	}

	return (
		<ul className="flex flex-col" aria-busy={isRefetching ? 'true' : undefined}>
			{conversations.map(conversation => (
				<li key={conversation.id}>
					<ChatListItem
						conversation={conversation}
						viewerId={viewerId}
						selected={conversation.id === selectedConversationId}
						href={`${hrefBase}/${conversation.id}`}
					/>
				</li>
			))}
		</ul>
	);
}
