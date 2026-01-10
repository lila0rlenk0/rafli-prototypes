import { cn } from '@/lib/utils';

export function Badge({
	className,
	variant = 'default',
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	variant?: 'default' | 'secondary' | 'outline';
}) {
	return (
		<div
			className={cn(
				'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none',
				{
					'bg-primary text-primary-foreground hover:bg-primary/80 border-transparent':
						variant === 'default',
					'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent':
						variant === 'secondary',
					'text-foreground': variant === 'outline',
				},
				className,
			)}
			{...props}
		/>
	);
}
