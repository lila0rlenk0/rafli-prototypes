import { cn } from '@/lib/class-names';

interface StatusPillProps {
	readonly online: boolean;
	readonly className?: string;
}

/**
 * Tiny online/offline indicator — coarse-grained on purpose. We never
 * display fine-grained "last seen" timestamps because they can be
 * correlated into a keystroke-timing side-channel for private chats.
 *
 * Colors come from `globals.css`: the `--color-green` token (already used
 * for the progress-bar fill in `form-header.tsx`) flags the live state; the
 * offline dot uses a translucent muted token. Text switches between
 * `foreground` and `muted-foreground` so the label contrast mirrors the
 * dot without introducing raw Tailwind palette classes.
 */
export function StatusPill({ online, className }: StatusPillProps) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 text-xs',
				online ? 'text-foreground' : 'text-muted-foreground',
				className,
			)}
			aria-label={online ? 'Online' : 'Offline'}
		>
			<span
				className={cn(
					'size-2 rounded-full',
					online ? 'bg-green' : 'bg-muted-foreground/40',
				)}
				aria-hidden
			/>
			{online ? 'Online' : 'Offline'}
		</span>
	);
}
