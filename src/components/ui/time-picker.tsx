'use client';

import { Clock } from 'lucide-react';

import { cn } from '@/lib/class-names';

interface TimePickerProps {
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

/**
 * Inline time input styled to match the DatePicker trigger.
 * Uses native `<input type="time">` with the browser picker indicator hidden
 * and a Clock icon on the left — follows shadcn/ui's recommended pattern.
 * Outputs HH:mm format (24-hour).
 *
 * @returns Time picker component
 */
export function TimePicker({
	value,
	onValueChange,
	className,
	disabled = false,
}: TimePickerProps) {
	return (
		<div
			className={cn(
				'flex h-9 w-full items-center rounded-md border border-[#E5E5E5] bg-white px-3 text-sm',
				disabled && 'cursor-not-allowed opacity-50',
				className,
			)}
		>
			<Clock className="text-muted-foreground mr-2 size-4 shrink-0" />
			<input
				type="time"
				value={value || ''}
				onChange={e => onValueChange?.(e.target.value)}
				disabled={disabled}
				className={cn(
					// Hide the native browser picker icon — users type the time directly
					'w-full appearance-none bg-transparent outline-none',
					'[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
					!value && 'text-muted-foreground',
				)}
			/>
		</div>
	);
}
