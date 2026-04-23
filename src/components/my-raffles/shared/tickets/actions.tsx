'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

interface TicketsStepActionsProps {
	onContinue: () => void;
	onClearAll: () => void;
	/** Whether the Clear All button is enabled — derived from the form state. */
	canClear: boolean;
	/**
	 * Optional extra utility classes for the Continue button. Used to match
	 * the create wizard's wider "px-6" Continue while the edit wizard keeps
	 * the default width.
	 */
	continueClassName?: string;
}

/**
 * Continue + Clear All action row for the Tickets step. Both composers
 * wire their own named handlers (`handleContinue`, `handleClearAll`) so
 * the component stays presentational.
 *
 * @returns Action row JSX.
 */
export function TicketsStepActions({
	onContinue,
	onClearAll,
	canClear,
	continueClassName,
}: TicketsStepActionsProps) {
	return (
		<div className="flex items-center gap-2">
			<Button
				type="button"
				onClick={onContinue}
				className={cn('cursor-pointer', continueClassName)}
			>
				Continue
			</Button>

			<Button
				variant="ghost"
				type="button"
				onClick={onClearAll}
				disabled={!canClear}
				className="flex cursor-pointer items-center gap-2"
			>
				<X data-icon="inline-start" />
				<span className="text-sm font-semibold">Clear all</span>
			</Button>
		</div>
	);
}
