'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Option for multi-select dropdown */
export interface MultiSelectOption {
	value: string;
	label: string;
	/** Secondary text below the label */
	description?: string;
	/** Icon rendered before the label */
	icon?: ReactNode;
}

interface MultiSelectProps {
	options: readonly MultiSelectOption[];
	value: string[];
	onValueChange: (value: string[]) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

/**
 * Multi-select dropdown using Popover + checkbox list.
 * Matches project styling: border-[#E5E5E5], bg-white, rounded-md trigger.
 */
export function MultiSelect({
	options,
	value,
	onValueChange,
	placeholder = 'Select...',
	className,
	disabled = false,
}: MultiSelectProps) {
	const [open, setOpen] = useState(false);

	/** Toggles a single option in/out of the selection */
	function handleToggle(optionValue: string) {
		const next = value.includes(optionValue)
			? value.filter(v => v !== optionValue)
			: [...value, optionValue];
		onValueChange(next);
	}

	/** Builds the trigger button label from current selection */
	function getTriggerLabel(): string {
		if (value.length === 0) return placeholder;
		if (value.length === options.length) return `All (${options.length})`;
		const selected = options.filter(o => value.includes(o.value));
		if (selected.length <= 2) return selected.map(o => o.label).join(', ');
		return `${selected.length} selected`;
	}

	/** Whether an option is currently selected */
	function isSelected(optionValue: string): boolean {
		return value.includes(optionValue);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="listbox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						'w-full cursor-pointer justify-between rounded-md border-[#E5E5E5] bg-white font-normal',
						value.length === 0 && 'text-muted-foreground',
						className,
					)}
				>
					<span className="truncate">{getTriggerLabel()}</span>
					<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-(--radix-popover-trigger-width) p-1"
				align="start"
			>
				<div className="flex max-h-[240px] flex-col overflow-y-auto">
					{options.map(option => (
						<button
							key={option.value}
							type="button"
							onClick={() => handleToggle(option.value)}
							className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors"
						>
							<span
								className={cn(
									'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
									isSelected(option.value)
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-input',
								)}
							>
								{isSelected(option.value) && <Check className="size-3" />}
							</span>
							{option.icon && (
								<span className="flex shrink-0 items-center">
									{option.icon}
								</span>
							)}
							<span className="flex min-w-0 flex-col items-start">
								<span className="truncate text-sm">{option.label}</span>
								{option.description && (
									<span className="text-muted-foreground truncate text-xs">
										{option.description}
									</span>
								)}
							</span>
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
