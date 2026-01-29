'use client';

import { ImageCarousel } from '@/components/ui/image-carousel';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { Update } from '@/types/update';

interface UpdateTimelineItemProps {
	update: Update;
}

/**
 * UpdateTimelineItem Component
 *
 * Renders a single update card.
 * Shows: host name, published date, image carousel (if any), and description.
 *
 * @param update - The update object to display
 */
export function UpdateTimelineItem({ update }: UpdateTimelineItemProps) {
	/**
	 * Formats the update date and time
	 * @param dateString - ISO date string
	 * @returns Formatted date string (e.g., "January 21, 2026, 19:01")
	 */
	function formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		const formattedDate = date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
		const formattedTime = date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		});
		return `${formattedDate}, ${formattedTime}`;
	}

	/**
	 * Checks if a string is a valid URL
	 * @param url - URL string to validate
	 * @returns true if valid URL, false otherwise
	 */
	function isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	const validImageUrls = update.imageUrls?.filter(isValidUrl) ?? [];
	const hasImages = validImageUrls.length > 0;
	const hasText = update.text && update.text.trim().length > 0;

	return (
		<div className="space-y-2 pb-6 last:pb-0">
			{/* Host info */}
			<div className="flex items-center gap-1">
				<span className="font-semibold">by {update.host.name}</span>
			</div>

			{/* Published date */}
			<p className="mb-4">{formatDateTime(update.createdAt)}</p>

			{/* Image carousel */}
			{hasImages && (
				<ImageCarousel
					images={validImageUrls}
					alt="Update"
					aspectRatio="aspect-video"
					maxHeight=""
					className="rounded-xl"
				/>
			)}

			{/* Description */}
			{hasText && (
				<div className="mt-4 space-y-2">
					<p className="text-[#7B7B7B]">Description</p>
					<MarkdownRenderer content={update.text} />
				</div>
			)}
		</div>
	);
}
