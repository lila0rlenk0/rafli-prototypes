import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Animated loading spinner using the Loader2 icon.
 * @returns Spinning loader icon
 */
export function Spinner({ className }: { className?: string }) {
	return (
		<Loader2 className={cn('size-10 animate-spin opacity-50', className)} />
	);
}
