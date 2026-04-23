'use client';

import { useState } from 'react';
import { ChevronDownIcon, Loader2Icon } from 'lucide-react';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/class-names';

/** Publish mode: immediate or scheduled */
export type PublishMode = 'now' | 'schedule';

interface OptionConfig {
	label: string;
	mode: PublishMode;
}

const OPTIONS: OptionConfig[] = [
	{ label: 'Go Live Now', mode: 'now' },
	{ label: 'Schedule for Later', mode: 'schedule' },
];

interface PublishSplitButtonProps {
	/** Whether the publish action is in progress */
	isPublishing: boolean;
	/** Callback when the user triggers a publish action */
	onPublish: (mode: PublishMode) => void;
	/** Additional class name for the root container */
	className?: string;
}

/**
 * GitHub-style split button for publishing or scheduling a raffle.
 * Left side executes the selected action, right chevron opens mode switcher.
 * Reusable across edit page header and raffle cards.
 */
export function PublishSplitButton({
	isPublishing,
	onPublish,
	className,
}: PublishSplitButtonProps) {
	const [selected, setSelected] = useState<PublishMode>('now');
	const selectedLabel =
		OPTIONS.find(o => o.mode === selected)?.label ?? 'Go Live Now';

	function handleMainClick() {
		if (isPublishing) return;
		onPublish(selected);
	}

	return (
		<div className={cn('flex items-stretch', className)}>
			<button
				type="button"
				onClick={handleMainClick}
				disabled={isPublishing}
				className="flex flex-1 items-center justify-center gap-2 rounded-l-full border-2 border-r-0 border-black bg-black px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black disabled:pointer-events-none disabled:opacity-50"
			>
				{isPublishing ? <Loader2Icon className="size-4 animate-spin" /> : null}
				{selectedLabel}
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
							onSelect={() => setSelected(option.mode)}
						>
							{option.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
