import { cn } from '@/lib/class-names';

function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('animate-pulse rounded-md bg-gray-200/50', className)}
			{...props}
		/>
	);
}

export { Skeleton };
