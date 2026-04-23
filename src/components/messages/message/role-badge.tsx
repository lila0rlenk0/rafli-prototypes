import { cn } from '@/lib/class-names';

import { roleLabel, type ViewerRole } from '../chat/chat-present';

interface RoleBadgeProps {
	readonly role: ViewerRole;
	/**
	 * `sm` (default) matches the density of the header and message-bubble
	 * role pills. `xs` is used inside the participant roster where chips
	 * sit beside each name and need to stay visually secondary to the
	 * name itself.
	 */
	readonly size?: 'xs' | 'sm';
	readonly className?: string;
}

// Shared across both sizes — font weight, shape, typography rhythm.
const BADGE_BASE_CLASSES =
	'inline-flex items-center rounded-full font-semibold tracking-wide uppercase';

const BADGE_SIZE_CLASSES: Readonly<
	Record<NonNullable<RoleBadgeProps['size']>, string>
> = {
	sm: 'h-5 px-2 text-2xs',
	xs: 'h-4 px-1.5 text-3xs',
};

/**
 * Small pill indicating a member's role in a conversation.
 * Semantic tokens from `globals.css` only — `brand-yellow|green|blue`
 * (host/winner/staff) sit on dark text, mirroring the pattern in
 * `subscription-tier-badge.tsx`, and `muted` carries the neutral member
 * tone. Never raw Tailwind color utilities, per `.claude/rules/shadcn.md`.
 */
export function RoleBadge({ role, size = 'sm', className }: RoleBadgeProps) {
	return (
		<span
			className={cn(
				BADGE_BASE_CLASSES,
				BADGE_SIZE_CLASSES[size],
				getRoleClasses(role),
				className,
			)}
			aria-label={`${roleLabel(role)} role`}
		>
			{roleLabel(role)}
		</span>
	);
}

/** Per-role background + text pair. Uses accent-* tokens defined in `globals.css`. */
function getRoleClasses(role: ViewerRole): string {
	switch (role) {
		case 'host':
			return 'bg-brand-yellow text-black';
		case 'winner':
			return 'bg-brand-mint text-black';
		case 'staff':
			return 'bg-brand-sky text-black';
		case 'member':
			return 'bg-muted text-muted-foreground';
		default: {
			const _never: never = role;
			return _never;
		}
	}
}
