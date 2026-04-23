import { type ReactNode } from 'react';

import { cn } from '@/lib/class-names';

interface ReviewRowProps {
	/** Short, human-readable label rendered with muted foreground. */
	label: string;
	/** The value being reviewed; rendered with default foreground. */
	children: ReactNode;
	/** Optional layout-only classes merged onto the root wrapper. */
	className?: string;
	/** Optional inline action (e.g., "Edit" button) rendered at the row end. */
	action?: ReactNode;
}

/**
 * Domain-agnostic labeled row for review-style screens.
 *
 * Mobile-first layout — label stacks above the value on small screens, flips
 * to label-beside-value on `sm:` to keep long values from wrapping awkwardly
 * next to short labels. Action slot (if present) always sits at the end so
 * callers can render inline "Edit" controls without an extra wrapper.
 *
 * @returns Review row element.
 */
export function ReviewRow({
	label,
	children,
	className,
	action,
}: ReviewRowProps) {
	return (
		<div
			className={cn(
				'flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
				className,
			)}
		>
			<dt className="text-muted-foreground text-sm">{label}</dt>
			<dd className="text-foreground flex items-start gap-2 text-sm sm:text-right">
				<span className="min-w-0 flex-1 break-words">{children}</span>
				{action ? <span className="shrink-0">{action}</span> : null}
			</dd>
		</div>
	);
}
