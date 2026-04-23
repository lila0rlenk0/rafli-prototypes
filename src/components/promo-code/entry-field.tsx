'use client';

import { Loader2, X } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/class-names';

interface PromoCodeEntryFieldProps {
	code: string;
	error: string | null;
	isValidating: boolean;
	onCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
	onKeyDown: (event: KeyboardEvent) => void;
	onApply: () => void;
	onCancel: () => void;
}

/**
 * Expanded input state for the promo code flow — text field, Apply
 * button, and the inline error + Cancel affordance. Parent owns the
 * actual code state; this component is purely presentational.
 */
export function PromoCodeEntryField({
	code,
	error,
	isValidating,
	onCodeChange,
	onKeyDown,
	onApply,
	onCancel,
}: PromoCodeEntryFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			{/* Match the pill-shaped bundle chips sitting above: rounded-full + border-black + h-9 so the promo row reads as part of the same control group. */}
			<div className="flex gap-2">
				<Input
					value={code}
					onChange={onCodeChange}
					onKeyDown={onKeyDown}
					placeholder="Enter code"
					disabled={isValidating}
					autoFocus
					maxLength={20}
					className={cn(
						'h-9 rounded-full border-black px-4 font-mono text-sm uppercase',
						error &&
							'border-red-300 focus-visible:border-red-400 focus-visible:ring-red-100',
					)}
				/>
				<Button
					variant="outline"
					onClick={onApply}
					disabled={!code.trim() || isValidating}
					className="hover:bg-brand-sky shrink-0 border-black bg-transparent shadow-none hover:text-black"
				>
					{isValidating ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
				</Button>
			</div>

			{error ? (
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-sm text-red-600">
						<X className="size-3.5" />
						<span>{error}</span>
					</div>
					<button
						type="button"
						onClick={onCancel}
						className="text-xs text-gray-500 transition-colors hover:text-gray-700"
					>
						Cancel
					</button>
				</div>
			) : null}
		</div>
	);
}
