import { cn } from '@/lib/class-names';
import type { PendingSend } from '@/store/chat-store';

import { AvatarCircle } from '../chat/avatar-circle';
import { VIEWER_ROLE } from '../chat/chat-present';

interface PendingBubbleProps {
	readonly entry: PendingSend;
	readonly viewerName: string;
}

/**
 * Optimistic bubble for a send that hasn't been confirmed yet. Rendered
 * from `pendingByTempId` so the user sees their message the instant they
 * press Enter, before the WS `ack` or REST response lands. Always the
 * viewer's own message — sender metadata is the current user.
 *
 * Whitespace handling mirrors `MessageBubble` so swapping an optimistic
 * bubble for the confirmed one on ack doesn't re-flow the layout
 * (collapsed → preserved newlines would otherwise jump on multi-paragraph
 * sends).
 *
 * @param props - Pending send entry plus the viewer's display name.
 * @returns JSX for the pending bubble.
 */
export function PendingBubble({ entry, viewerName }: PendingBubbleProps) {
	const failed = entry.status === 'failed';
	return (
		<div className="flex flex-row-reverse items-start gap-2">
			<AvatarCircle
				displayName={viewerName}
				role={VIEWER_ROLE.MEMBER}
				size="sm"
			/>
			<div className="max-w-full-screen-sm flex flex-col items-end gap-1">
				<div
					className={cn(
						// See component JSDoc — match MessageBubble's whitespace
						// handling so the ack-swap doesn't reflow the bubble.
						'bg-primary text-primary-foreground w-fit rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap',
						failed && 'opacity-70',
					)}
				>
					{entry.body}
				</div>
				<div className="text-muted-foreground text-2xs flex items-center gap-2">
					{failed ? (
						<span className="text-destructive" role="alert">
							failed — refresh to retry
						</span>
					) : (
						<span className="italic">sending…</span>
					)}
				</div>
			</div>
		</div>
	);
}
