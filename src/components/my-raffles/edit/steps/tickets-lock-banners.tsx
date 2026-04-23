import { CircleDashed, Clock, Lock } from 'lucide-react';

/**
 * Edit-only lock banners that appear on the Tickets step when the raffle's
 * state freezes fields the create wizard never locks. The shared fieldsets
 * render their "draft start date" affordance when the start date isn't
 * today — these banners cover the locked cases only, so the create flow
 * never needs to import this module.
 */

/**
 * "Sweepstakes is live — start date locked" banner. Rendered by the edit
 * composer inside the time-period card when `restrictions.startDateLocked`
 * is true.
 *
 * @returns Sky-toned banner with a "Live" chip.
 */
export function StartDateLockedBanner() {
	return (
		<div className="flex w-full items-center justify-between rounded-lg bg-sky-100 p-4">
			<div className="flex items-center gap-2">
				<Clock className="text-brand-blue size-6" aria-hidden="true" />
				<span className="text-xs">
					Sweepstakes is live. Start date cannot be changed.
				</span>
			</div>
			<div className="flex items-center gap-2 rounded-2xl bg-sky-200 px-2 py-1">
				<CircleDashed
					className="stroke-3-5 size-4 text-sky-400"
					aria-hidden="true"
				/>
				<span className="text-sm">Live</span>
			</div>
		</div>
	);
}

/**
 * "Price is locked because entries have been sold" banner. Rendered by
 * the edit composer inside the entries card when `restrictions.priceLocked`
 * is true (replaces the default "price cannot change after first entry"
 * info banner that the shared fieldset shows when unlocked).
 *
 * @returns Peach-toned banner with a lock icon.
 */
export function PriceLockedBanner() {
	return (
		<div className="bg-peach-100 flex w-full items-center justify-between rounded-lg p-4">
			<div className="flex items-center gap-2">
				<Lock className="text-amber size-6" aria-hidden="true" />
				<span className="text-xs">
					Price is locked because entries have been sold
				</span>
			</div>
		</div>
	);
}
