'use client';

import { MessageCircleIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { COMMENT_SORT, type Comment, type CommentSort } from '@/types/comment';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { useComments } from '@/services/comment/use-comments';

import { CommentInput } from './comment-input';
import { CommentItem } from './comment-item';
import { CommentSortTabs } from './comment-sort-tabs';

interface CommentSectionProps {
	raffleId: string;
	isAuthenticated: boolean;
	isOwner: boolean;
	currentUserId: string | null;
}

/**
 * Main comment section orchestrator
 *
 * Accordion wrapper (matching RaffleUpdatesCard pattern) containing:
 * - Header with "Comments" title, total count badge, and sort tabs
 * - Comment input (or sign-in prompt for unauthenticated)
 * - Paginated comment list with "Load more" button
 *
 * @param raffleId - The raffle ID
 * @param isAuthenticated - Whether user is logged in
 * @param isOwner - Whether user owns the raffle
 * @param currentUserId - Current user's ID for delete permissions
 */
export function CommentSection({
	raffleId,
	isAuthenticated,
	isOwner,
	currentUserId,
}: CommentSectionProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	/** Reads sort from URL query, defaults to 'top' */
	function getSort(): CommentSort {
		const param = searchParams.get('commentSort');
		if (
			param === COMMENT_SORT.NEWEST ||
			param === COMMENT_SORT.OLDEST ||
			param === COMMENT_SORT.TOP
		) {
			return param;
		}
		return COMMENT_SORT.TOP;
	}

	/** Updates the commentSort URL query parameter */
	function handleSort(value: CommentSort) {
		const params = new URLSearchParams(searchParams);
		if (value === COMMENT_SORT.TOP) {
			params.delete('commentSort');
		} else {
			params.set('commentSort', value);
		}
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	}

	const sort = getSort();

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useComments({ raffleId, sort, isAuthenticated });

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
		<div className="w-full overflow-hidden rounded-2xl bg-white">
			<Accordion
				type="single"
				collapsible
				defaultValue="comments"
				className="w-full"
			>
				<AccordionItem value="comments" className="border-none">
					<AccordionTrigger className="px-8 py-4 hover:no-underline">
						<div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-3">
								<h3 className="font-clash-display text-3xl font-semibold">
									Comments
								</h3>
								{totalCount > 0 ? (
									<span className="rounded-full bg-black px-2 py-0.5 text-xs text-white">
										{totalCount}
									</span>
								) : null}
							</div>
							{/* Sort tabs — stop accordion toggle propagation */}
							<div
								onClick={function stopPropagation(e) {
									e.stopPropagation();
								}}
								onKeyDown={function preventKeyToggle(e) {
									e.stopPropagation();
								}}
								role="presentation"
							>
								<CommentSortTabs sort={sort} onSort={handleSort} />
							</div>
						</div>
					</AccordionTrigger>

					<AccordionContent className="px-8 pb-8">
						{/* Comment input or sign-in prompt */}
						<div className="mb-6">
							{isAuthenticated ? (
								<CommentInput raffleId={raffleId} />
							) : (
								<p className="text-sm text-gray-500">
									Sign in to leave a comment.
								</p>
							)}
						</div>

						{/* Comment list */}
						{isLoading ? (
							<div className="flex flex-col items-center py-8">
								<p className="text-sm text-gray-400">Loading comments...</p>
							</div>
						) : comments.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<MessageCircleIcon className="mb-3 size-8 text-gray-300" />
								<p className="text-sm text-gray-500">No comments yet</p>
								<p className="text-xs text-gray-400">
									Be the first to share your thoughts.
								</p>
							</div>
						) : (
							<div className="space-y-4 pt-2">
								{comments.map(comment => (
									<CommentItem
										key={comment.id}
										comment={comment}
										raffleId={raffleId}
										isAuthenticated={isAuthenticated}
										isOwner={isOwner}
										currentUserId={currentUserId}
									/>
								))}

								{/* Load more button */}
								{hasNextPage ? (
									<div className="flex justify-center pt-2">
										<button
											type="button"
											onClick={function loadMore() {
												fetchNextPage();
											}}
											disabled={isFetchingNextPage}
											className="rounded-full border border-black px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-[#C4EDFF]"
										>
											{isFetchingNextPage ? 'Loading...' : 'Load more comments'}
										</button>
									</div>
								) : null}
							</div>
						)}
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
