'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import { MarkdownRenderer } from '@/components/ui-custom/markdown-renderer';

interface CollapsibleDescriptionProps {
	content: string;
	/** Optional slot rendered after description when expanded (e.g. category tags) */
	expandedSlot?: ReactNode;
}

/**
 * Renders a raffle description with "Read more" / "Read less" toggle.
 * Truncates content to 3 lines by default; when expanded, reveals `expandedSlot`.
 */
export function CollapsibleDescription({
	content,
	expandedSlot,
}: CollapsibleDescriptionProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="flex min-w-0 flex-col gap-2">
			<label className="text-ink-300 text-sm">Description</label>

			<div className={isExpanded ? undefined : 'line-clamp-3'}>
				<MarkdownRenderer content={content} className="text-sm" />
			</div>

			{isExpanded ? expandedSlot : null}

			<button
				type="button"
				onClick={() => setIsExpanded(prev => !prev)}
				className="cursor-pointer self-start text-sm font-medium text-black underline underline-offset-2"
			>
				{isExpanded ? 'Read less' : 'Read more'}
			</button>
		</div>
	);
}
