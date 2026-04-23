/**
 * Placeholder shown inside the scrollable message list when a conversation
 * has no messages AND no in-flight optimistic sends for the viewer. Lives
 * in its own file so `conversation/view.tsx` only composes the state, and
 * future copy tweaks (or adding a CTA to invite more members) don't rerun
 * the parent's size budget.
 *
 * Rendering contract: sits in the same scrollable region as message
 * bubbles, so it stretches to fill the list and centers its copy — the
 * user lands on the "no messages yet" prompt instead of a blank pane.
 *
 * @returns JSX for the empty-state panel.
 */
export function EmptyConversation() {
	return (
		<div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-sm">
			<p className="font-semibold">No messages yet</p>
			<p>
				Start the conversation — everyone in this room will get a notification.
			</p>
		</div>
	);
}
