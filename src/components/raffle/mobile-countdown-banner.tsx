'use client';

import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';

interface MobileCountdownBannerProps {
	endAt: string;
}

/**
 * Compact yellow countdown banner for mobile.
 * Shows "ENDS IN 03 Days 04 Hours 03 Minutes 03 Seconds" inline.
 * Hidden on lg+ breakpoints where the full countdown card is visible.
 *
 * @returns Yellow banner with countdown or null before hydration
 */
export function MobileCountdownBanner({ endAt }: MobileCountdownBannerProps) {
	const { isExpired, isHydrated, ...time } = useRaffleSaleWindow(endAt);

	if (!isHydrated) return null;

	if (isExpired) {
		return (
			<div className="fixed inset-x-0 top-14 z-30 flex items-center justify-center bg-[#F6FF8B] py-3 lg:hidden">
				<p className="font-clash-display text-lg font-semibold">
					Time&apos;s up!
				</p>
			</div>
		);
	}

	/** Formats a number as two-digit string */
	function pad(n: number): string {
		return String(n).padStart(2, '0');
	}

	return (
		<div className="fixed inset-x-0 top-14 z-30 flex w-full items-center justify-between bg-[#F6FF8B] px-4 py-2 lg:hidden">
			<p className="font-clash-display text-lg font-semibold">ENDS IN</p>
			<div className="flex items-center gap-3">
				<CountdownUnit value={pad(time.days)} label="Days" />
				<CountdownUnit value={pad(time.hours)} label="Hours" />
				<CountdownUnit value={pad(time.minutes)} label="Minutes" />
				<CountdownUnit value={pad(time.seconds)} label="Seconds" />
			</div>
		</div>
	);
}

interface CountdownUnitProps {
	value: string;
	label: string;
}

/** Single countdown unit for the mobile banner */
function CountdownUnit({ value, label }: CountdownUnitProps) {
	return (
		<div className="flex flex-col items-center">
			<span className="text-lg font-semibold">{value}</span>
			<span className="text-[10px] text-[#7B7B7B]">{label}</span>
		</div>
	);
}
