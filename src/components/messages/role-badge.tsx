import { cn } from '@/lib/utils';

import { roleLabel, type ViewerRole } from './chat-utils';

interface RoleBadgeProps {
	readonly role: ViewerRole;
	readonly className?: string;
}

/**
 * Small pill indicating a member's role in a conversation.
 * Semantic tokens from `globals.css` only — `accent-yellow|green|blue`
 * (host/winner/staff) sit on dark text, mirroring the pattern in
 * `subscription-tier-badge.tsx`, and `muted` carries the neutral member
 * tone. Never raw Tailwind color utilities, per `.claude/rules/shadcn.md`.
 */
export function RoleBadge({ role, className }: RoleBadgeProps) {
	return (
		<span
			className={cn(
				'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold tracking-wide uppercase',
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
			return 'bg-accent-yellow text-black';
		case 'winner':
			return 'bg-accent-green text-black';
		case 'staff':
			return 'bg-accent-blue text-black';
		case 'member':
			return 'bg-muted text-muted-foreground';
		default: {
			const _never: never = role;
			return _never;
		}
	}
}
