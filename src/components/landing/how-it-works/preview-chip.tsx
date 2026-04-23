import type { ReactNode } from 'react';

interface PreviewChipProps {
	icon: ReactNode;
	title: string;
	body: string;
}

/**
 * Compact icon chip used in the verify-yourself preview row. Sets
 * expectations for the three verification steps before the user
 * submits — scannable at a glance, avoids a prose bullet list.
 */
export function PreviewChip({ icon, title, body }: PreviewChipProps) {
	return (
		<div className="bg-card flex flex-col gap-1.5 rounded-xl border p-4">
			<div className="flex items-center gap-2">
				{icon}
				<span className="text-sm font-semibold">{title}</span>
			</div>
			<p className="text-muted-foreground text-xs/relaxed">{body}</p>
		</div>
	);
}
