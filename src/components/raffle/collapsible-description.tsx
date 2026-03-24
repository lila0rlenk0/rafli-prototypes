'use client';

import { useEffect, useRef, useState } from 'react';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

/** Height threshold (px) above which the description is collapsible */
const COLLAPSED_HEIGHT = 160;

interface CollapsibleDescriptionProps {
	content: string;
}

/**
 * Renders a raffle description with "Read More" / "Read Less" toggle.
 * Collapses the content to ~5-6 lines by default. If the content fits
 * within the threshold, no toggle is shown.
 *
 * @returns Collapsible description section with label and toggle
 */
export function CollapsibleDescription({
	content,
}: CollapsibleDescriptionProps) {
	const contentRef = useRef<HTMLDivElement>(null);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useEffect(() => {
		const el = contentRef.current;
		if (!el) return;

		/**
		 * Compare the natural scroll height against the collapsed threshold
		 * to determine if the content overflows and needs a toggle.
		 */
		setIsOverflowing(el.scrollHeight > COLLAPSED_HEIGHT);
	}, [content]);

	function handleToggle() {
		setIsExpanded(prev => !prev);
	}

	function getToggleLabel(): string {
		return isExpanded ? 'Read Less' : 'Read More';
	}

	return (
		<div className="flex min-w-0 flex-col gap-2">
			<label className="text-sm text-[#B4B4B4]">Description</label>

			<div className="relative">
				<div
					ref={contentRef}
					className={
						!isExpanded && isOverflowing
							? 'max-h-40 overflow-hidden'
							: undefined
					}
				>
					<MarkdownRenderer content={content} className="text-sm" />
				</div>

				{/* Gradient fade overlay when collapsed */}
				{!isExpanded && isOverflowing && (
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
				)}
			</div>

			{isOverflowing && (
				<button
					type="button"
					onClick={handleToggle}
					className="cursor-pointer self-start text-sm font-medium text-black underline underline-offset-2"
				>
					{getToggleLabel()}
				</button>
			)}
		</div>
	);
}
