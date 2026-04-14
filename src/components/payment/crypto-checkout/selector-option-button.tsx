'use client';

import type { ReactNode } from 'react';

interface SelectorOptionButtonProps {
	label: string;
	leadingVisual?: ReactNode;
	meta: ReactNode;
	onClick: () => void;
}

/**
 * Shared option row for chain/token selectors.
 *
 * This stays intentionally narrow:
 * - both selectors already use the exact same button shell and hover states
 * - centralising only the repeated frame keeps styling consistent
 * - chain/token specific lookup logic still lives in their own components
 */
export function SelectorOptionButton({
	label,
	leadingVisual,
	meta,
	onClick,
}: SelectorOptionButtonProps) {
	return (
		<button
			type="button"
			className="group flex h-14 items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-5 text-left transition-all hover:border-black hover:shadow-sm"
			onClick={onClick}
		>
			<span className="flex items-center gap-3">
				{leadingVisual ? leadingVisual : null}
				<span className="text-sm font-medium">{label}</span>
			</span>
			<span className="text-xs text-[#7B7B7B] transition-colors group-hover:text-black">
				{meta}
			</span>
		</button>
	);
}
