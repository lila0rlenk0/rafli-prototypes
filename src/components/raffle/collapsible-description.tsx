'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface CollapsibleDescriptionProps {
	content: string;
	/** Optional slot rendered after description when expanded (e.g. category tags) */
	expandedSlot?: ReactNode;
}

/**
 * Renders a raffle description with "Read more" / "Read less" toggle.
 * Truncates content to 3 lines by default using line-clamp.
 * When expanded, also reveals the expandedSlot (e.g. category badges).
 *
 * @returns Collapsible description section with label and toggle
 */
export function CollapsibleDescription({
	content,
	expandedSlot,
}: CollapsibleDescriptionProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	function handleToggle() {
		setIsExpanded(prev => !prev);
	}

	function getToggleLabel(): string {
		return isExpanded ? 'Read less' : 'Read more';
	}

	return (
		<div className="flex min-w-0 flex-col gap-2">
			<label className="text-sm text-[#B4B4B4]">Description</label>

			<div className={isExpanded ? undefined : 'line-clamp-3'}>
				<MarkdownRenderer content={content} className="text-sm" />
			</div>

			{isExpanded && expandedSlot}

			<button
				type="button"
				onClick={handleToggle}
				className="cursor-pointer self-start text-sm font-medium text-black underline underline-offset-2"
			>
				{getToggleLabel()}
			</button>
		</div>
	);
}
