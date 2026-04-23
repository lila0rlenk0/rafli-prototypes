import * as React from 'react';

import { cn } from '@/lib/class-names';

/** Text input with auto-select on focus for number types */
function Input({
	className,
	type,
	onFocus,
	...props
}: React.ComponentProps<'input'>) {
	/** Selects all content on focus for number inputs so users can type immediately */
	function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
		if (type === 'number') e.target.select();
		onFocus?.(e);
	}

	return (
		<input
			type={type}
			data-slot="input"
			onFocus={handleFocus}
			className={cn(
				'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
				'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
				'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
