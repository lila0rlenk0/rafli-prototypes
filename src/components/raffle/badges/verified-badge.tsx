import { ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/class-names';

interface VerifiedBadgeProps {
	verified: boolean | null;
	className?: string;
}

/** null→"Verifying...", true→"Verified" (green), false→"Failed" (red). */
export function VerifiedBadge({ verified, className }: VerifiedBadgeProps) {
	if (verified === null) {
		return (
			<span
				className={cn(
					'inline-flex items-center gap-1 text-xs text-gray-400',
					className,
				)}
			>
				<ShieldCheck className="size-3" />
				Verifying...
			</span>
		);
	}

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 text-xs font-medium',
				verified ? 'text-green-600' : 'text-red-500',
				className,
			)}
		>
			<ShieldCheck className="size-3" />
			{verified ? 'Verified' : 'Failed'}
		</span>
	);
}
