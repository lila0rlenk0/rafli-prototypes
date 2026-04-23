'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';

import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import { cn } from '@/lib/class-names';

// Desktop quick-pick "set-to" values. Mobile quick-picks live in
// `StickyBuyTicketsCta` so they sit on top of the keyboard area, not
// scrolled away inside the inline card.
const BUNDLE_SIZES_DESKTOP = [10, 25, 50];

interface TicketSelectorProps {
	maxTickets: number;
}

/**
 * Ticket quantity selector with +/- controls, direct input, and desktop
 * bundle shortcuts. Quantity is owned by the `TicketQuantityStore` so the
 * mobile sticky CTA can mutate it from outside the inline card.
 *
 * `maxTickets === 0` means unlimited — no upper bound enforced.
 */
export function TicketSelector({ maxTickets }: TicketSelectorProps) {
	// Quantity is the single source of truth — store-backed so the mobile
	// sticky CTA bundle buttons can update it from outside this subtree.
	const quantity = useTicketQuantityStore(state => state.quantity);
	const setStoreQuantity = useTicketQuantityStore(state => state.setQuantity);

	// Local draft string for the text input. Cannot use `quantity.toString()`
	// directly: while typing, the input may temporarily hold an invalid value
	// (e.g. empty string mid-edit) that we don't want committed to the store.
	const [inputValue, setInputValue] = useState(() => quantity.toString());

	// External sync via the "set state during render" pattern (React docs
	// recommended). When the store quantity changes from outside this
	// component (mobile bundle quick-picks in StickyBuyTicketsCta, promo code
	// free-tickets sync via applyPromo), we mirror the change into the input
	// draft *during render* — not via a useEffect pass after commit. Doing
	// this during render avoids the derived-state useEffect smell called out
	// in `.claude/rules/react-effects.md` and also skips the extra re-render
	// the effect would trigger, so the user sees the synced value in the
	// same frame as the store update.
	const [prevStoreQuantity, setPrevStoreQuantity] = useState(quantity);
	if (quantity !== prevStoreQuantity) {
		setPrevStoreQuantity(quantity);
		setInputValue(quantity.toString());
	}

	// 0 means unlimited participants — use MAX_SAFE_INTEGER so bound checks always pass
	const isUnlimited = maxTickets === 0;
	const effectiveMax = isUnlimited ? Number.MAX_SAFE_INTEGER : maxTickets;

	function validateQuantity(value: number): number {
		if (isNaN(value) || value < 1) return 1;
		if (value > effectiveMax) return effectiveMax;
		return Math.floor(value);
	}

	function updateQuantity(newQuantity: number) {
		const validated = validateQuantity(newQuantity);
		setStoreQuantity(validated);
		setInputValue(validated.toString());
	}

	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const value = event.target.value;
		setInputValue(value);

		// Only commit to the store if the value is a valid number in range —
		// invalid intermediates (empty, "0", non-numeric) stay as draft until blur.
		const numValue = parseInt(value, 10);
		if (!isNaN(numValue) && numValue >= 1 && numValue <= effectiveMax) {
			setStoreQuantity(numValue);
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
		<div className="flex flex-col gap-4">
			{/* Mobile: full-width counter only — quick-pick bundles live in the sticky CTA */}
			<div className="flex items-center justify-center rounded-full border border-black px-4 py-2 lg:hidden">
				<button
					onClick={() => updateQuantity(quantity - 1)}
					disabled={decrementDisabled}
					aria-label="Decrease entry quantity"
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
					aria-label="Entry quantity"
				/>
				<button
					onClick={() => updateQuantity(quantity + 1)}
					disabled={incrementDisabled}
					aria-label="Increase entry quantity"
					className="cursor-pointer px-2 disabled:cursor-not-allowed disabled:opacity-30"
				>
					<Plus className="size-5" />
				</button>
			</div>

			{/* Desktop: inline counter + set-to bundle buttons */}
			<div className="hidden lg:block">
				<div className="flex items-center justify-between">
					<p className="text-ink-500 text-sm">Number of entries</p>
					<div className="flex items-center justify-center gap-2 rounded-full border border-black px-4 py-1">
						<button
							onClick={() => updateQuantity(quantity - 1)}
							disabled={decrementDisabled}
							aria-label="Decrease entry quantity"
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
							aria-label="Entry quantity"
						/>
						<button
							onClick={() => updateQuantity(quantity + 1)}
							disabled={incrementDisabled}
							aria-label="Increase entry quantity"
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
									? 'bg-brand-sky border-black'
									: 'hover:bg-brand-sky border-black disabled:hover:bg-transparent',
							)}
						>
							{size} entries
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
