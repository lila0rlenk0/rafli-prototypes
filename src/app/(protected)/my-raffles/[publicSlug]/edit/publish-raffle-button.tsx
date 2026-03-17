'use client';

import { useState } from 'react';
import { ChevronDownIcon, Loader2Icon } from 'lucide-react';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useEditForm } from './edit-form-provider';

type PublishOption = 'now' | 'schedule';

interface OptionConfig {
	label: string;
	mode: PublishOption;
}

const OPTIONS: OptionConfig[] = [
	{ label: 'Publish Now', mode: 'now' },
	{ label: 'Schedule', mode: 'schedule' },
];

/**
 * GitHub-style split button for publishing or scheduling a draft raffle
 * Left side executes the selected action, right chevron opens mode switcher
 */
export function PublishRaffleButton() {
	const { isPublishing, handlePublish } = useEditForm();
	const [selected, setSelected] = useState<PublishOption>('now');

	function getSelectedLabel(): string {
		return OPTIONS.find(o => o.mode === selected)?.label ?? 'Publish Now';
	}

	function handleMainClick() {
		if (isPublishing) return;
		handlePublish(selected);
	}

	function handleOptionSelect(mode: PublishOption) {
		setSelected(mode);
	}

	return (
		<div className="flex items-stretch">
			<button
				type="button"
				onClick={handleMainClick}
				disabled={isPublishing}
				className="flex items-center gap-2 rounded-l-full border-2 border-r-0 border-black bg-black px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black disabled:pointer-events-none disabled:opacity-50"
			>
				{isPublishing && <Loader2Icon className="size-4 animate-spin" />}
				{getSelectedLabel()}
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						disabled={isPublishing}
						className="flex items-center rounded-r-full border-2 border-l border-black bg-black px-2 py-1.5 text-white transition-colors hover:bg-white hover:text-black disabled:pointer-events-none disabled:opacity-50"
						aria-label="Select publish mode"
					>
						<div className="mr-1 h-4 w-px bg-white/40" />
						<ChevronDownIcon className="size-4" />
					</button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end">
					{OPTIONS.map(option => (
						<DropdownMenuItem
							key={option.mode}
							onSelect={() => handleOptionSelect(option.mode)}
						>
							{option.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
