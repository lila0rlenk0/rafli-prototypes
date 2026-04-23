'use client';

import { ImageCarousel } from '@/components/ui-custom/image-carousel';
import { MarkdownRenderer } from '@/components/ui-custom/markdown-renderer';
import type { Update } from '@/types/update';

interface UpdateTimelineItemProps {
	update: Update;
	/** Fallback host name from raffle when update host is Unknown */
	hostName?: string;
}

export function UpdateTimelineItem({
	update,
	hostName,
}: UpdateTimelineItemProps) {
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

	function isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	const validImages = update.imageUrls?.filter(isValidUrl) ?? [];
	const hasImages = validImages.length > 0;
	const hasText = update.text && update.text.trim().length > 0;

	return (
		<div className="flex flex-col gap-2 pb-6 last:pb-0">
			{/* Host info */}
			<div className="flex items-center gap-1">
				<span className="font-semibold">
					by{' '}
					{update.host.name === 'Unknown'
						? (hostName ?? update.host.name)
						: update.host.name}
				</span>
			</div>

			{/* Published date */}
			<p className="mb-4">{formatDateTime(update.createdAt)}</p>

			{/* Image carousel */}
			{hasImages ? (
				<ImageCarousel
					images={validImages}
					alt="Update"
					aspectRatio="aspect-video"
					maxHeight=""
					className="rounded-xl"
					sizes="(max-width: 1024px) 100vw, 736px"
				/>
			) : null}

			{/* Description */}
			{hasText ? (
				<div className="mt-4 flex flex-col gap-2">
					<p className="text-ink-500">Description</p>
					<MarkdownRenderer content={update.text} />
				</div>
			) : null}
		</div>
	);
}
