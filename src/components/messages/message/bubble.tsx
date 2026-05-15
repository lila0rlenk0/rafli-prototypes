import { memo } from 'react';

import { cn } from '@/lib/class-names';
import { getWinningStatusLabel } from '@/lib/utils/raffle/winning-status-label';
import { MESSAGE_TYPE, type Message } from '@/types/chat';

import { AvatarCircle } from '../chat/avatar-circle';
import {
	formatRelativeTime,
	linkifyMessage,
	roleLabel,
	VIEWER_ROLE,
	type ViewerRole,
} from '../chat/chat-present';
import { RoleBadge } from './role-badge';

interface MessageBubbleProps {
	readonly message: Message;
	readonly isOwn: boolean;
	readonly senderRole: ViewerRole | null;
	/**
	 * Viewer display name — used to build the monogram for the viewer's own
	 * bubbles. Non-viewer senders use their role label (e.g. "Host" → "H")
	 * because the chat DTOs don't yet carry member names.
	 */
	readonly viewerName: string;
}

/**
 * Single message row. Renders the body as a sequence of safe text / link
 * segments produced by `linkifyMessage`, never via `dangerouslySetInnerHTML`.
 *
 * Deleted messages are shown as a tombstone placeholder so the
 * conversation stays readable. System messages render with muted chrome
 * and no sender metadata. Optimistic pre-ack bubbles are rendered by
 * `PendingBubble` in the conversation view — this component only handles
 * server-confirmed messages.
 *
 * Wrapped in `memo()` because the conversation view re-renders on every
 * WS event (new message, typing tick, presence flip, read receipt) — and
 * each render would otherwise re-linkify + re-render every bubble in the
 * list. With memo, only the single bubble whose `message` ref actually
 * changed re-renders; the rest short-circuit on prop equality. All four
 * props are primitives or store-stable refs (`mergeMessage` preserves
 * identity for untouched rows), so default shallow compare is correct.
 */
function MessageBubbleImpl({
	message,
	isOwn,
	senderRole,
	viewerName,
}: MessageBubbleProps) {
	const isDeleted = message.deletedAt !== null;
	const isSystem = message.type === MESSAGE_TYPE.SYSTEM;
	const isShipment = message.type === MESSAGE_TYPE.SHIPMENT_UPDATE;

	if (isSystem || isShipment) {
		return (
			<div
				className="bg-muted/50 text-muted-foreground max-w-full-screen-sm mx-auto rounded-md px-3 py-2 text-center text-xs"
				role="note"
			>
				{isShipment ? formatShipmentBody(message) : (message.body ?? '')}
			</div>
		);
	}

	const segments = isDeleted ? [] : linkifyMessage(message.body);
	// Viewer's own bubble uses their real name; otherwise fall back to the
	// sender's role label ("Host" → "H"). `senderRole` is only null when
	// the sender isn't a conversation member, which shouldn't happen for
	// a rendered message — MEMBER is the safe neutral if it ever does.
	const avatarName = isOwn
		? viewerName
		: roleLabel(senderRole ?? VIEWER_ROLE.MEMBER);

	return (
		<div
			className={cn(
				'flex items-start gap-2',
				isOwn ? 'flex-row-reverse' : 'flex-row',
			)}
		>
			<AvatarCircle
				displayName={avatarName}
				role={senderRole ?? undefined}
				size="sm"
			/>
			<div
				className={cn(
					'max-w-full-screen-sm flex flex-col gap-1',
					isOwn ? 'items-end' : 'items-start',
				)}
			>
				{!isOwn && senderRole ? <RoleBadge role={senderRole} /> : null}

				<div
					className={cn(
						// `whitespace-pre-wrap` preserves author-intended newlines
						// (Shift+Enter in the composer) so multi-paragraph messages
						// render the way the sender typed them — matches WhatsApp /
						// Telegram / iMessage conventions. `break-words` keeps long
						// URLs and unbroken tokens from overflowing the 85% bubble
						// clamp on narrow viewports.
						'w-fit rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap',
						isOwn ? 'bg-brand-dark text-on-dark' : 'bg-muted text-foreground',
						isDeleted && 'text-muted-foreground italic',
					)}
				>
					{isDeleted
						? 'Message removed'
						: segments.map(function renderSegment(segment, index) {
								// key uses index because segments are derived deterministically
								// from the body string — stable across renders of the same message.
								if (segment.kind === 'link') {
									return (
										<a
											key={index}
											href={segment.value}
											target="_blank"
											rel="noopener noreferrer nofollow ugc"
											className="underline decoration-dotted underline-offset-2"
										>
											{segment.value}
										</a>
									);
								}
								return <span key={index}>{segment.value}</span>;
							})}
				</div>

				<div className="text-muted-foreground text-2xs flex items-center gap-2">
					<span>{formatRelativeTime(message.createdAt)}</span>
					{message.editedAt ? <span>(edited)</span> : null}
				</div>
			</div>
		</div>
	);
}

export const MessageBubble = memo(MessageBubbleImpl);

/**
 * Renders the shipment_update metadata as a short summary line.
 * Body is always null for shipment messages; the information lives in
 * `metadata`. Guards against missing metadata so a partial backend
 * payload degrades gracefully.
 */
function formatShipmentBody(message: Message): string {
	if (!message.metadata) return 'Shipment update';
	// Humanize both ends of the transition — raw enum tokens like
	// `awaiting_host` must never surface to the user; the label map is
	// authoritative so a backend enum rename doesn't leak snake_case.
	const from = getWinningStatusLabel(message.metadata.fromStatus);
	const to = getWinningStatusLabel(message.metadata.toStatus);
	return `Shipment: ${from} → ${to}`;
}
