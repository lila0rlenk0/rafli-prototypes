'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

const BUNDLE_SIZES_DESKTOP = [3, 6, 9];
const BUNDLE_SIZES_MOBILE = [6, 12, 20];

interface TicketSelectorProps {
	maxTickets: number;
	onQuantityChange: (quantity: number) => void;
}

/**
 * Ticket quantity selector with +/- controls, direct input, and bundle shortcuts.
 * `maxTickets === 0` means unlimited — no upper bound enforced.
 */
export function TicketSelector({
	maxTickets,
	onQuantityChange,
}: TicketSelectorProps) {
	const [quantity, setQuantity] = useState(1);
	const [inputValue, setInputValue] = useState('1');

	// 0 means unlimited participants — use MAX_SAFE_INTEGER so bound checks always pass
	const isUnlimited = maxTickets === 0;
	const effectiveMax = isUnlimited ? Number.MAX_SAFE_INTEGER : maxTickets;

	function validateQuantity(value: number): number {
		if (isNaN(value) || value < 1) return 1;
		if (value > effectiveMax) return effectiveMax;
		return Math.floor(value);
	}

	// Centralizes state + parent sync — avoids useEffect for parent notification.
	function updateQuantity(newQuantity: number) {
		const validated = validateQuantity(newQuantity);
		setQuantity(validated);
		setInputValue(validated.toString());
		onQuantityChange(validated);
	}

	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const value = event.target.value;
		setInputValue(value);

		// Only update quantity and notify parent if value is a valid number
		const numValue = parseInt(value, 10);
		if (!isNaN(numValue) && numValue >= 1 && numValue <= effectiveMax) {
			setQuantity(numValue);
			onQuantityChange(numValue);
		}
	}

	function handleInputBlur() {
		const numValue = parseInt(inputValue, 10);
		if (isNaN(numValue) || numValue < 1) {
			updateQuantity(1);
		} else if (numValue > effectiveMax) {
			updateQuantity(effectiveMax);
		} else {
			updateQuantity(numValue);
		}
	}

	function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			event.currentTarget.blur();
		}
	}

	// Never disabled for unlimited raffles
	const incrementDisabled = !isUnlimited && quantity >= maxTickets;
	const decrementDisabled = quantity <= 1;
	// Bundle disabled when already at the cap — same condition as increment
	const bundleDisabled = incrementDisabled;

	return (
		<div className="space-y-4">
			{/* Mobile: additive bundle buttons (+6, +12, +20) */}
			<div className="flex items-center justify-between gap-2 lg:hidden">
				{BUNDLE_SIZES_MOBILE.map(size => (
					<button
						key={size}
						onClick={() => updateQuantity(quantity + size)}
						disabled={bundleDisabled}
						className="flex w-full cursor-pointer items-center justify-center rounded-full border border-black py-3 text-sm transition-colors duration-150 hover:bg-[#C4EDFF] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
					>
						+{size}
					</button>
				))}
			</div>

			{/* Quantity counter — full-width on mobile, inline on desktop */}
			<div className="flex items-center justify-center rounded-full border border-black px-4 py-2 lg:hidden">
				<button
					onClick={() => updateQuantity(quantity - 1)}
					disabled={decrementDisabled}
					aria-label="Decrease ticket quantity"
					className="cursor-pointer px-2 disabled:cursor-not-allowed disabled:opacity-30"
				>
					<Minus className="size-5" />
				</button>
				<input
					type="number"
					min={1}
					max={isUnlimited ? undefined : maxTickets}
					value={inputValue}
					onChange={handleInputChange}
					onBlur={handleInputBlur}
					onKeyDown={handleInputKeyDown}
					className="w-12 flex-1 [appearance:textfield] border-none bg-transparent text-center outline-none focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					aria-label="Ticket quantity"
				/>
				<button
					onClick={() => updateQuantity(quantity + 1)}
					disabled={incrementDisabled}
					aria-label="Increase ticket quantity"
					className="cursor-pointer px-2 disabled:cursor-not-allowed disabled:opacity-30"
				>
					<Plus className="size-5" />
				</button>
			</div>

			{/* Desktop: inline counter + set-to bundle buttons */}
			<div className="hidden lg:block">
				<div className="flex items-center justify-between">
					<p className="text-sm text-[#7B7B7B]">Number of tickets</p>
					<div className="flex items-center justify-center gap-2 rounded-full border border-black px-4 py-1">
						<button
							onClick={() => updateQuantity(quantity - 1)}
							disabled={decrementDisabled}
							aria-label="Decrease ticket quantity"
							aria-disabled={decrementDisabled}
							className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
						>
							<Minus className="size-4" />
						</button>
						<input
							type="number"
							min={1}
							max={isUnlimited ? undefined : maxTickets}
							value={inputValue}
							onChange={handleInputChange}
							onBlur={handleInputBlur}
							onKeyDown={handleInputKeyDown}
							className="w-8 [appearance:textfield] border-none bg-transparent text-center outline-none focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							aria-label="Ticket quantity"
						/>
						<button
							onClick={() => updateQuantity(quantity + 1)}
							disabled={incrementDisabled}
							aria-label="Increase ticket quantity"
							aria-disabled={incrementDisabled}
							className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
						>
							<Plus className="size-4" />
						</button>
					</div>
				</div>

				<div className="mt-4 flex items-center justify-between gap-2">
					{BUNDLE_SIZES_DESKTOP.map(size => (
						<button
							key={size}
							onClick={() => updateQuantity(size)}
							disabled={bundleDisabled}
							className={cn(
								'flex w-full cursor-pointer items-center justify-center rounded-full border py-2 text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-30',
								quantity === size
									? 'border-black bg-[#C4EDFF]'
									: 'border-black hover:bg-[#C4EDFF] disabled:hover:bg-transparent',
							)}
						>
							{size} tickets
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
