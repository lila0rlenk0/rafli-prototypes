'use client';

import { ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/class-names';

export interface FilterOption {
	value: string;
	label: string;
}

interface FilterSelectProps {
	options: readonly FilterOption[];
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
}

/**
 * FilterSelect Component
 *
 * A simple dropdown select component designed for filtering.
 * Displays a button with the selected value and opens a popover with options.
 */
export function FilterSelect({
	options,
	value,
	onValueChange,
	placeholder = 'Select...',
	className,
}: FilterSelectProps) {
	const [open, setOpen] = React.useState(false);

	function getSelectedOption(): FilterOption | undefined {
		return options.find(option => option.value === value);
	}

	function handleSelect(selectedValue: string): void {
		onValueChange?.(selectedValue === value ? '' : selectedValue);
		setOpen(false);
	}

	const selectedOption = getSelectedOption();

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					role="combobox"
					aria-expanded={open}
					className={cn(
						'text-navy h-auto cursor-pointer gap-2 px-0 font-normal hover:bg-transparent',
						className,
					)}
				>
					<span className="text-sm/6">
						{selectedOption ? selectedOption.label : placeholder}
					</span>
					<ChevronsUpDown className="size-4 shrink-0" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-50 p-0" align="start">
				<Command>
					<CommandList>
						<CommandEmpty>No options found.</CommandEmpty>
						<CommandGroup>
							{options.map(option => (
								<CommandItem
									key={option.value}
									value={option.value}
									onSelect={handleSelect}
									className="hover:bg-accent cursor-pointer"
								>
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
