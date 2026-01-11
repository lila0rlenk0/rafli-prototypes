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
 * Manages ticket quantity selection with increment/decrement controls and
 * bundle purchase shortcuts. Enforces minimum (1) and maximum (available tickets)
 * constraints.
 *
 * Features:
 * - +/- controls for precise quantity selection
 * - Bundle buttons for quick selection (3, 6, 9 tickets)
 * - Smart overflow handling (bundles respect max limit)
 * - Disabled states when at limits
 * - Real-time total price calculation
 */
export function TicketSelector({
	maxTickets,
	onQuantityChange,
}: TicketSelectorProps) {
	const [quantity, setQuantity] = useState(1);

	/**
	 * Handles incrementing the ticket quantity by 1
	 */
	const handleIncrement = useCallback(() => {
		setQuantity((prev) => Math.min(prev + 1, maxTickets));
	}, [maxTickets]);

	/**
	 * Handles decrementing the ticket quantity by 1
	 */
	const handleDecrement = useCallback(() => {
		setQuantity((prev) => Math.max(prev - 1, 1));
	}, []);

	/**
	 * Handles adding a bundle of tickets
	 * Respects max limit and only adds what's available
	 * @param bundleSize - Number of tickets in the bundle (3, 6, or 9)
	 */
	const handleBundle = useCallback(
		(bundleSize: number) => {
			setQuantity((prev) => Math.min(prev + bundleSize, maxTickets));
		},
		[maxTickets]
	);

	/**
	 * Checks if a bundle button should be disabled
	 * @param currentQty - Current ticket quantity
	 * @param max - Maximum allowed tickets
	 * @returns True if button should be disabled
	 */
	function isBundleDisabled(currentQty: number, max: number): boolean {
		return currentQty >= max;
	}

	/**
	 * Checks if increment button should be disabled
	 * @param currentQty - Current ticket quantity
	 * @param max - Maximum allowed tickets
	 * @returns True if button should be disabled
	 */
	function isIncrementDisabled(currentQty: number, max: number): boolean {
		return currentQty >= max;
	}

	/**
	 * Checks if decrement button should be disabled
	 * @param currentQty - Current ticket quantity
	 * @returns True if button should be disabled
	 */
	function isDecrementDisabled(currentQty: number): boolean {
		return currentQty <= 1;
	}

	// Notify parent component when quantity changes
	useEffect(() => {
		onQuantityChange(quantity);
	}, [quantity, onQuantityChange]);

	// Handle sold out state
	if (maxTickets === 0) {
		return (
			<div className="flex items-center justify-center rounded-2xl border border-black bg-gray-100 p-4">
				<p className="text-lg font-semibold text-gray-600">Sold Out</p>
			</div>
		);
	}

	const incrementDisabled = isIncrementDisabled(quantity, maxTickets);
	const decrementDisabled = isDecrementDisabled(quantity);
	const bundleDisabled = isBundleDisabled(quantity, maxTickets);

	return (
		<div className="space-y-4">
			{/* Quantity selector */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-[#7B7B7B]">Number of tickets</p>

				<div className="flex items-center justify-center gap-6 rounded-full border border-black px-4 py-1">
					<button
						onClick={handleDecrement}
						disabled={decrementDisabled}
						aria-label="Decrease ticket quantity"
						aria-disabled={decrementDisabled}
						className="disabled:cursor-not-allowed disabled:opacity-30"
					>
						<Minus className="size-4" />
					</button>
					<p className="text-lg">{quantity}</p>
					<button
						onClick={handleIncrement}
						disabled={incrementDisabled}
						aria-label="Increase ticket quantity"
						aria-disabled={incrementDisabled}
						className="disabled:cursor-not-allowed disabled:opacity-30"
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
					className="flex w-full items-center justify-center rounded-full border border-black py-2 disabled:cursor-not-allowed disabled:opacity-30"
				>
					<p className="text-sm">3 Tickets</p>
				</button>
				<button
					onClick={() => handleBundle(6)}
					disabled={bundleDisabled}
					className="flex w-full items-center justify-center rounded-full border border-black py-2 disabled:cursor-not-allowed disabled:opacity-30"
				>
					<p className="text-sm">6 Tickets</p>
				</button>
				<button
					onClick={() => handleBundle(9)}
					disabled={bundleDisabled}
					className="flex w-full items-center justify-center rounded-full border border-black py-2 disabled:cursor-not-allowed disabled:opacity-30"
				>
					<p className="text-sm">9 Tickets</p>
				</button>
			</div>
		</div>
	);
}
