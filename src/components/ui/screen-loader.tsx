import { LogoIcon } from '@/assets/logo-icon';
import { cn } from '@/lib/utils';

interface ScreenLoaderProps {
	className?: string;
}

/**
 * ScreenLoader Component
 *
 * Branded full-screen loading state using the Raffle logo icon.
 * Spins clockwise for a polished loading experience.
 */
export function ScreenLoader({ className }: ScreenLoaderProps) {
	return (
		<div
			className={cn(
				'flex h-screen w-full items-center justify-center',
				className,
			)}
		>
			<LogoIcon className="size-12 animate-spin opacity-50" />
		</div>
	);
}
