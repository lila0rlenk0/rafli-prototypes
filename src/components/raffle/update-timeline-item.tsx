import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { Update } from '@/types/update';
import Image from 'next/image';

interface UpdateTimelineItemProps {
	update: Update;
}

/**
 * UpdateTimelineItem Component
 *
 * Renders a single update in the timeline.
 * Shows: date, description (markdown), images (all optional except date).
 * Conditionally renders description/images only if they exist.
 *
 * @param update - The update object to display
 */
export function UpdateTimelineItem({ update }: UpdateTimelineItemProps) {
	/**
	 * Formats the update date
	 * @param dateString - ISO date string
	 * @returns Formatted date string
	 */
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	/**
	 * Formats the update time
	 * @param dateString - ISO date string
	 * @returns Formatted time string
	 */
	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	}

	const hasImages = update.imageUrls && update.imageUrls.length > 0;
	const hasText = update.text && update.text.trim().length > 0;

	return (
		<div className="relative flex gap-4 pb-6 last:pb-0">
			{/* Timeline line */}
			<div className="absolute top-3 left-[7px] h-[calc(100%-12px)] w-0.5 bg-gray-200 last:hidden" />

			{/* Timeline dot */}
			<div className="relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 border-black bg-white" />

			{/* Content */}
			<div className="flex-1 space-y-3">
				{/* Date and time */}
				<div className="flex items-center gap-2 text-sm text-gray-500">
					<span className="font-medium text-gray-900">
						{formatDate(update.createdAt)}
					</span>
					<span>at</span>
					<span>{formatTime(update.createdAt)}</span>
				</div>

				{/* Description */}
				{hasText && (
					<div className="rounded-lg bg-gray-50 p-4">
						<MarkdownRenderer content={update.text} className="text-sm" />
					</div>
				)}

				{/* Images */}
				{hasImages && (
					<div className="flex flex-wrap gap-2">
						{update.imageUrls.map((imageUrl, index) => (
							<div
								key={index}
								className="relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200"
							>
								<Image
									src={imageUrl}
									alt={`Update image ${index + 1}`}
									fill
									className="object-cover"
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
