'use client';

import { formatDate } from '@/lib/utils/date-format';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Parses a YYYY-MM-DD string into a local Date (no timezone shift).
 * Uses component parts to avoid UTC midnight being interpreted as previous day.
 * @returns Date at local midnight
 */
function parseDateString(dateString: string): Date {
	const [year, month, day] = dateString.split('-').map(Number);
	return new Date(year, month - 1, day);
}

/**
 * Formats a Date as YYYY-MM-DD using local date parts.
 * Avoids `toISOString()` which uses UTC and can shift the date by one day.
 * @returns Local date string in YYYY-MM-DD format
 */
function formatDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Strips time from a Date for date-only comparisons.
 * @returns Date normalized to local midnight
 */
function normalizeDate(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

interface DatePickerProps {
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	minDate?: Date;
	/** Show month/year dropdowns instead of arrows — ideal for birth dates */
	captionLayout?: 'label' | 'dropdown';
	/** First selectable year when captionLayout is "dropdown" */
	fromYear?: number;
	/** Last selectable year when captionLayout is "dropdown" */
	toYear?: number;
}

/**
 * Date picker with popover calendar.
 * Controlled via string value (YYYY-MM-DD) — no internal date state.
 * Derives the displayed Date directly from the `value` prop,
 * eliminating the stale-state useEffect sync anti-pattern.
 *
 * @returns Date picker component
 */
export function DatePicker({
	value,
	onValueChange,
	placeholder = 'Select date',
	className,
	disabled = false,
	minDate,
	captionLayout,
	fromYear,
	toYear,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);

	// Derive Date from string prop — no useState/useEffect sync needed.
	// parseDateString is cheap (no iteration), so useMemo is unnecessary.
	const selectedDate = value ? parseDateString(value) : undefined;

	/** Handles calendar date selection, formats to YYYY-MM-DD, and closes popover */
	function handleSelect(date: Date | undefined) {
		onValueChange?.(date ? formatDateString(date) : '');
		setOpen(false);
	}

	/**
	 * Checks if a date should be disabled based on minDate.
	 * Normalizes both dates to midnight for date-only comparison.
	 * @returns true if date is before minDate
	 */
	function isDateDisabled(date: Date): boolean {
		if (!minDate) return false;
		return normalizeDate(date) < normalizeDate(minDate);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					disabled={disabled}
					className={cn(
						'w-full cursor-pointer justify-start rounded-md border-[#E5E5E5] bg-white text-left font-normal',
						!selectedDate && 'text-muted-foreground',
						className,
					)}
				>
					<CalendarIcon className="mr-2 size-4" />
					{selectedDate ? formatDate(selectedDate) : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					defaultMonth={selectedDate}
					selected={selectedDate}
					onSelect={handleSelect}
					disabled={minDate ? isDateDisabled : undefined}
					captionLayout={captionLayout}
					fromYear={fromYear}
					toYear={toYear}
					className="rounded-md"
				/>
			</PopoverContent>
		</Popover>
	);
}
