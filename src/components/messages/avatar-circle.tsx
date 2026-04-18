import { memo } from 'react';

import { cn } from '@/lib/utils';

import { avatarInitialFromName, type ViewerRole } from './chat-utils';

interface AvatarCircleProps {
	/**
	 * Name the monogram is derived from — same algorithm as the /profile
	 * section so avatars look identical across the app. Callers without a
	 * real user name (e.g. the conversation list, where chat DTOs don't
	 * carry member names) pass a label derived from the conversation
	 * context (title or role).
	 */
	readonly displayName: string;
	readonly role?: ViewerRole;
	readonly size?: 'sm' | 'md';
	readonly className?: string;
}

const SIZE_CLASSES = {
	sm: 'size-7 text-[11px]',
	md: 'size-9 text-sm',
} as const;

/**
 * Name-based avatar stand-in — a monogram circle derived from a display
 * name. We intentionally avoid pulling avatar URLs in v1: that would
 * require cross-user profile lookups (leaks membership of unrelated
 * conversations) and a CDN allow-list that we don't yet want to maintain.
 *
 * Wrapped in `memo()` because this renders per message bubble and per
 * sidebar row — both lists churn on unrelated WS events, and the
 * initial/tint derivations run each time. All four props are primitives,
 * so default shallow compare skips the re-run whenever the name, role,
 * size, and className stay identical (the common case).
 */
function AvatarCircleImpl({
	displayName,
	role,
	size = 'md',
	className,
}: AvatarCircleProps) {
	const initial = avatarInitialFromName(displayName);
	return (
		<div
			className={cn(
				'flex shrink-0 items-center justify-center rounded-full font-semibold',
				SIZE_CLASSES[size],
				getRoleTintClass(role),
				className,
			)}
			aria-hidden
		>
			{initial}
		</div>
	);
}

export const AvatarCircle = memo(AvatarCircleImpl);

/**
 * Tints the avatar background by role so conversations read at a glance
 * even without loaded profile metadata. Uses the `accent-*` tokens defined
 * in `globals.css` (light pastel surfaces) paired with `text-black` — the
 * same pattern as `subscription-tier-badge.tsx`, because those accent
 * backgrounds have no dark-mode variant and need a fixed dark glyph to
 * stay readable. MEMBER and undefined share the neutral `muted` token.
 */
function getRoleTintClass(role: ViewerRole | undefined): string {
	switch (role) {
		case 'host':
			return 'bg-accent-yellow text-black';
		case 'winner':
			return 'bg-accent-green text-black';
		case 'staff':
			return 'bg-accent-blue text-black';
		case 'member':
		case undefined:
			return 'bg-muted text-foreground';
		default: {
			const _never: never = role;
			return _never;
		}
	}
}
