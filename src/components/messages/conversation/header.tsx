import type { Conversation } from '@/types/chat';

import {
	formatConversationSubtitle,
	formatConversationTitle,
	type ViewerRole,
} from '../chat/chat-present';
import { ParticipantRoster } from './participant-roster';
import { RoleBadge } from '../message/role-badge';
import { StatusPill } from '../message/status-pill';

interface ConversationHeaderProps {
	readonly conversation: Conversation;
	readonly viewerId: string;
	readonly viewerRole: ViewerRole | null;
	readonly connected: boolean;
}

/**
 * Sticky header for the conversation pane — title, optional winner
 * subtitle, participant roster, viewer role pill, and live connection
 * indicator.
 *
 * Lifted out of `ConversationView` so the parent stays focused on
 * orchestration and the pure-presentation layer here has a predictable
 * size budget. The header never owns state; all derived values are
 * threaded in by the parent.
 *
 * @param props - Conversation + viewer context + live connection flag.
 * @returns JSX for the header row.
 */
export function ConversationHeader({
	conversation,
	viewerId,
	viewerRole,
	connected,
}: ConversationHeaderProps) {
	return (
		<header className="flex items-start justify-between gap-2 border-b px-4 py-3">
			{/* `flex-1 min-w-0` on the title column — without `flex-1` the
			    column sizes to its content and `truncate` on the h2 never
			    triggers, so long raffle titles push the role/status pills
			    off-screen on narrow viewports. */}
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h2 className="truncate text-sm font-semibold">
					{formatConversationTitle(conversation)}
				</h2>
				{/* Winner pin: every chat in this product is a winner_chat of
				    (winner + host + platform admins), so surfacing the winner
				    as a dedicated subtitle above the roster anchors the
				    "whose prize is this?" question without scanning chips.
				    `formatConversationSubtitle` returns null for non-winner
				    types, so this line self-hides if the contract ever
				    broadens to other chat kinds. */}
				<WinnerSubtitle conversation={conversation} />
				{/* Roster names each other participant with a role chip —
				    replaces the prior "X participants" count. Winner is
				    pinned as the subtitle above; the roster fills in host +
				    platform admins so the viewer can see who's in-room. */}
				<ParticipantRoster conversation={conversation} viewerId={viewerId} />
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{viewerRole ? <RoleBadge role={viewerRole} /> : null}
				<StatusPill online={connected} />
			</div>
		</header>
	);
}

interface WinnerSubtitleProps {
	readonly conversation: Conversation;
}

/**
 * Header subtitle that pins the winner above the participant roster. Keeps
 * the conversation-view JSX shallow by isolating the "no subtitle for non-
 * winner types" branch here — `formatConversationSubtitle` already returns
 * null outside `winner_chat`, so this component just renders nothing in
 * that case and the parent stays oblivious to the conversation kind.
 *
 * @param props - Conversation to derive the subtitle from.
 * @returns JSX or null when the conversation isn't a winner_chat.
 */
function WinnerSubtitle({ conversation }: WinnerSubtitleProps) {
	const subtitle = formatConversationSubtitle(conversation);
	if (!subtitle) return null;
	return <p className="text-muted-foreground truncate text-xs">{subtitle}</p>;
}
