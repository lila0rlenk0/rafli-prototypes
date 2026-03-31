'use client';

import { MessageCircleIcon } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { useComments } from '@/services/comment/use-comments';
import { COMMENT_SORT, type Comment } from '@/types/comment';
import type { Update } from '@/types/update';

import { CommentInput } from './comments/comment-input';
import { CommentItem } from './comments/comment-item';
import { UpdateTimelineItem } from './update-timeline-item';

const FEED_TAB = {
	LIVE_FEED: 'live-feed',
	HOST_UPDATES: 'host-updates',
} as const;

type FeedTab = (typeof FEED_TAB)[keyof typeof FEED_TAB];

const FEED_FILTER = {
	ALL: 'all',
	HOST: 'host',
	ACTIVITY: 'activity',
	COMMENTS: 'comments',
} as const;

type FeedFilter = (typeof FEED_FILTER)[keyof typeof FEED_FILTER];

interface LiveFeedSectionProps {
	raffleId: string;
	isAuthenticated: boolean;
	isOwner: boolean;
	currentUserId: string | null;
	updates: Update[];
	hostName?: string;
	actionSlot?: React.ReactNode;
}

/**
 * Combined live feed section with tabs for "Live feed" and "Host updates"
 * and filter buttons for All, Host, Activity, Comments.
 *
 * @returns Tabbed feed section with comments, updates, and activity
 */
export function LiveFeedSection({
	raffleId,
	isAuthenticated,
	isOwner,
	currentUserId,
	updates,
	hostName,
	actionSlot,
}: LiveFeedSectionProps) {
	const [activeTab, setActiveTab] = useState<FeedTab>(FEED_TAB.LIVE_FEED);
	const [activeFilter, setActiveFilter] = useState<FeedFilter>(FEED_FILTER.ALL);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useComments({ raffleId, sort: COMMENT_SORT.NEWEST, isAuthenticated });

	/** Flattens all loaded pages into a single comment array */
	function getAllComments(): Comment[] {
		if (!data?.pages) return [];
		return data.pages.flatMap(page => page.items);
	}

	/** Gets total comment count from first page metadata */
	function getTotalCount(): number {
		return data?.pages[0]?.total ?? 0;
	}

	const comments = getAllComments();
	const totalCount = getTotalCount();

	return (
		<div className="w-full rounded-3xl bg-white px-4 py-6 lg:overflow-hidden lg:p-8">
			{/* Tab bar */}
			<div className="flex items-center gap-6">
				<button
					type="button"
					onClick={() => setActiveTab(FEED_TAB.LIVE_FEED)}
					className={cn(
						'font-clash-display relative pb-2 text-2xl font-semibold transition-colors',
						activeTab === FEED_TAB.LIVE_FEED
							? 'text-[#151516]'
							: 'text-[#B4B4B4]',
					)}
				>
					Live feed
					{totalCount > 0 && (
						<span className="ml-2 inline-flex size-4 items-center justify-center rounded-full bg-[#FB6D3A] text-[8px] font-semibold text-white">
							{totalCount > 9 ? '9+' : totalCount}
						</span>
					)}
					{activeTab === FEED_TAB.LIVE_FEED && (
						<span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#151516]" />
					)}
				</button>
				<button
					type="button"
					onClick={() => setActiveTab(FEED_TAB.HOST_UPDATES)}
					className={cn(
						'font-clash-display relative pb-2 text-2xl font-semibold transition-colors',
						activeTab === FEED_TAB.HOST_UPDATES
							? 'text-[#151516]'
							: 'text-[#B4B4B4]',
					)}
				>
					Host updates
					{updates.length > 0 && (
						<span className="ml-2 inline-flex size-4 items-center justify-center rounded-full bg-[#FB6D3A] text-[8px] font-semibold text-white">
							{updates.length > 9 ? '9+' : updates.length}
						</span>
					)}
					{activeTab === FEED_TAB.HOST_UPDATES && (
						<span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#151516]" />
					)}
				</button>
				{actionSlot}
			</div>

			{/* Live feed content */}
			{activeTab === FEED_TAB.LIVE_FEED && (
				<div className="mt-8 space-y-4">
					{/* Filter bar — scrollable on mobile */}
					<div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
						{Object.entries(FEED_FILTER).map(([key, value]) => (
							<button
								key={key}
								type="button"
								onClick={() => setActiveFilter(value)}
								className={cn(
									'shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors lg:py-2',
									activeFilter === value
										? 'bg-[#151516] text-white'
										: 'border border-[#121211] text-[#121211]',
								)}
							>
								{key.charAt(0) + key.slice(1).toLowerCase()}
							</button>
						))}
					</div>

					{/* Feed items */}
					{isLoading ? (
						<div className="flex flex-col items-center py-8">
							<p className="text-sm text-gray-400">Loading feed...</p>
						</div>
					) : comments.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<MessageCircleIcon className="mb-3 size-8 text-gray-300" />
							<p className="text-sm text-gray-500">No activity yet</p>
							<p className="text-xs text-gray-400">
								Be the first to share your thoughts.
							</p>
						</div>
					) : (
						<div className="space-y-0">
							{comments.map(comment => (
								<div key={comment.id}>
									<CommentItem
										comment={comment}
										raffleId={raffleId}
										isAuthenticated={isAuthenticated}
										isOwner={isOwner}
										currentUserId={currentUserId}
									/>
									<div className="my-4 h-px w-full bg-[#eee]" />
								</div>
							))}

							{hasNextPage && (
								<div className="flex justify-center pt-2">
									<button
										type="button"
										onClick={function loadMore() {
											fetchNextPage();
										}}
										disabled={isFetchingNextPage}
										className="rounded-full border border-black px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-[#C4EDFF]"
									>
										{isFetchingNextPage ? 'Loading...' : 'Load more'}
									</button>
								</div>
							)}
						</div>
					)}

					{/* Comment input */}
					<div className="mt-4 rounded-xl border border-[#eee] p-4">
						{isAuthenticated ? (
							<CommentInput
								raffleId={raffleId}
								placeholder="Comment or ask a question anonymously..."
							/>
						) : (
							<p className="text-sm text-gray-500">
								Sign in to leave a comment.
							</p>
						)}
					</div>
				</div>
			)}

			{/* Host updates content */}
			{activeTab === FEED_TAB.HOST_UPDATES && (
				<div className="mt-8">
					{updates.length > 0 ? (
						<div className="space-y-0">
							{updates.map((update, index) => (
								<div key={update.id}>
									<UpdateTimelineItem update={update} hostName={hostName} />
									{index < updates.length - 1 && (
										<div className="mb-6 h-px w-full bg-[#e5e5e5]" />
									)}
								</div>
							))}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<MessageCircleIcon className="mb-3 size-8 text-gray-300" />
							<p className="text-sm text-gray-500">No updates yet</p>
							<p className="text-xs text-gray-400">
								The host hasn&apos;t posted any updates for this raffle.
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
