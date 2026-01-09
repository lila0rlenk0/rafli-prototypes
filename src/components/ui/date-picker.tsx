'use client';

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

// Parse date string (YYYY-MM-DD) to Date object without timezone issues
function parseDateString(dateString: string): Date {
	const [year, month, day] = dateString.split('-').map(Number);
	return new Date(year, month - 1, day);
}

interface DatePickerProps {
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function DatePicker({
	value,
	onValueChange,
	placeholder = 'Select date',
	className,
	disabled = false,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);
	const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
		value ? parseDateString(value) : undefined,
	);

	// Sync internal state with external value changes
	React.useEffect(() => {
		if (value) {
			setSelectedDate(parseDateString(value));
		} else {
			setSelectedDate(undefined);
		}
	}, [value]);

	const handleSelect = (date: Date | undefined) => {
		setSelectedDate(date);
		if (date) {
			// Format date as local date string (YYYY-MM-DD) without timezone conversion
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const formattedDate = `${year}-${month}-${day}`;
			onValueChange?.(formattedDate);
		} else {
			onValueChange?.('');
		}
		setOpen(false);
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

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
					<CalendarIcon className="mr-2 h-4 w-4" />
					{selectedDate ? formatDate(selectedDate) : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					defaultMonth={selectedDate}
					selected={selectedDate}
					onSelect={handleSelect}
					className="rounded-md"
				/>
			</PopoverContent>
		</Popover>
	);
}
