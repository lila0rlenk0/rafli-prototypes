'use client';

import { Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface TicketSelectorProps {
	maxTickets: number;
	onQuantityChange: (quantity: number) => void;
}

/**
 * TicketSelector Component
 *
 * Manages ticket quantity selection with increment/decrement controls,
 * bundle purchase shortcuts, and an editable input field. Enforces minimum (1)
 * and maximum (available tickets) constraints.
 *
 * When maxTickets is 0, it means unlimited - no upper bound is enforced.
 *
 * Features:
 * - +/- controls for precise quantity selection
 * - Editable input field for direct quantity entry
 * - Bundle buttons for quick selection (3, 6, 9 tickets)
 * - Smart overflow handling (bundles respect max limit)
 * - Disabled states when at limits
 * - Real-time total price calculation
 * - Input validation with automatic correction
 */
export function TicketSelector({
	maxTickets,
	onQuantityChange,
}: TicketSelectorProps) {
	const [quantity, setQuantity] = useState(1);
	const [inputValue, setInputValue] = useState('1');

	// 0 means unlimited participants
	const isUnlimited = maxTickets === 0;
	// Use a high number for unlimited, otherwise use maxTickets
	const effectiveMax = isUnlimited ? Number.MAX_SAFE_INTEGER : maxTickets;

	/**
	 * Validates and normalizes a quantity value
	 * Ensures the value is within valid bounds (1 to effectiveMax)
	 * @param value - The quantity value to validate
	 * @returns Validated quantity value
	 */
	function validateQuantity(value: number): number {
		if (isNaN(value) || value < 1) return 1;
		if (value > effectiveMax) return effectiveMax;
		return Math.floor(value);
	}

	/**
	 * Updates quantity and input value synchronously
	 * @param newQuantity - The new quantity value
	 */
	function updateQuantity(newQuantity: number) {
		const validated = validateQuantity(newQuantity);
		setQuantity(validated);
		setInputValue(validated.toString());
	}

	/**
	 * Handles incrementing the ticket quantity by 1
	 */
	const handleIncrement = useCallback(() => {
		setQuantity(prev => {
			const newValue = Math.min(prev + 1, effectiveMax);
			setInputValue(newValue.toString());
			return newValue;
		});
	}, [effectiveMax]);

	/**
	 * Handles decrementing the ticket quantity by 1
	 */
	const handleDecrement = useCallback(() => {
		setQuantity(prev => {
			const newValue = Math.max(prev - 1, 1);
			setInputValue(newValue.toString());
			return newValue;
		});
	}, []);

	/**
	 * Handles adding a bundle of tickets
	 * Respects max limit and only adds what's available
	 * @param bundleSize - Number of tickets in the bundle (3, 6, or 9)
	 */
	const handleBundle = useCallback(
		(bundleSize: number) => {
			setQuantity(prev => {
				const newValue = Math.min(prev + bundleSize, effectiveMax);
				setInputValue(newValue.toString());
				return newValue;
			});
		},
		[effectiveMax],
	);

	/**
	 * Handles input change while user is typing
	 * Allows temporary invalid values during typing
	 * @param event - Input change event
	 */
	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const value = event.target.value;
		setInputValue(value);

		// Only update quantity if value is a valid number
		const numValue = parseInt(value, 10);
		if (!isNaN(numValue) && numValue >= 1 && numValue <= effectiveMax) {
			setQuantity(numValue);
		}
	}

	/**
	 * Handles input blur (when user finishes typing)
	 * Validates and corrects the value if needed
	 */
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

	/**
	 * Handles Enter key press in input
	 * Validates and applies the value
	 * @param event - Keyboard event
	 */
	function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			event.currentTarget.blur();
		}
	}

	/**
	 * Checks if a bundle button should be disabled
	 * Never disabled for unlimited raffles
	 * @param currentQty - Current ticket quantity
	 * @returns True if button should be disabled
	 */
	function isBundleDisabled(currentQty: number): boolean {
		if (isUnlimited) return false;
		return currentQty >= maxTickets;
	}

	/**
	 * Checks if increment button should be disabled
	 * Never disabled for unlimited raffles
	 * @param currentQty - Current ticket quantity
	 * @returns True if button should be disabled
	 */
	function isIncrementDisabled(currentQty: number): boolean {
		if (isUnlimited) return false;
		return currentQty >= maxTickets;
	}

	/**
	 * Checks if decrement button should be disabled
	 * @param currentQty - Current ticket quantity
	 * @returns True if button should be disabled
	 */
	function isDecrementDisabled(currentQty: number): boolean {
		return currentQty <= 1;
	}

	// Sync input value when quantity changes (from buttons/bundles)
	useEffect(() => {
		setInputValue(quantity.toString());
	}, [quantity]);

	// Notify parent component when quantity changes
	useEffect(() => {
		onQuantityChange(quantity);
	}, [quantity, onQuantityChange]);

	const incrementDisabled = isIncrementDisabled(quantity);
	const decrementDisabled = isDecrementDisabled(quantity);
	const bundleDisabled = isBundleDisabled(quantity);

	return (
		<div className="space-y-4">
			{/* Quantity selector */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-[#7B7B7B]">Number of tickets</p>

				<div className="flex items-center justify-center gap-2 rounded-full border border-black px-4 py-1">
					<button
						onClick={handleDecrement}
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
						onClick={handleIncrement}
						disabled={incrementDisabled}
						aria-label="Increase ticket quantity"
						aria-disabled={incrementDisabled}
						className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
					>
						<Plus className="size-4" />
					</button>
				</div>
			</div>

			{/* Bundle buttons */}
			<div className="flex items-center justify-between gap-2">
				<button
					onClick={() => handleBundle(3)}
					disabled={bundleDisabled}
					className="disabled:hover:bg-background flex w-full cursor-pointer items-center justify-center rounded-full border border-black py-2 transition-colors duration-150 hover:bg-[#C4EDFF] disabled:cursor-not-allowed disabled:opacity-30"
				>
					<p className="text-sm">3 Tickets</p>
				</button>
				<button
					onClick={() => handleBundle(6)}
					disabled={bundleDisabled}
					className="disabled:hover:bg-background flex w-full cursor-pointer items-center justify-center rounded-full border border-black py-2 transition-colors duration-150 hover:bg-[#C4EDFF] disabled:cursor-not-allowed disabled:opacity-30"
				>
					<p className="text-sm">6 Tickets</p>
				</button>
				<button
					onClick={() => handleBundle(9)}
					disabled={bundleDisabled}
					className="disabled:hover:bg-background flex w-full cursor-pointer items-center justify-center rounded-full border border-black py-2 transition-colors duration-150 hover:bg-[#C4EDFF] disabled:cursor-not-allowed disabled:opacity-30"
				>
					<p className="text-sm">9 Tickets</p>
				</button>
			</div>
		</div>
	);
}
