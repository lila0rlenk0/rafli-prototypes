'use client';

import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';

interface MobileCountdownBannerProps {
	endAt: string;
}

/**
 * Compact yellow countdown banner for mobile.
 * Hidden on lg+ where the full countdown card is visible.
 */
export function MobileCountdownBanner({ endAt }: MobileCountdownBannerProps) {
	const { isExpired, isHydrated, ...time } = useRaffleSaleWindow(endAt);

	if (!isHydrated) return null;

	if (isExpired) {
		return (
			<div className="bg-brand-yellow fixed inset-x-0 top-14 z-30 flex items-center justify-center py-3 lg:hidden">
				<p className="font-clash-display text-lg font-semibold">
					Time&apos;s up!
				</p>
			</div>
		);
	}

	return (
		<div className="bg-brand-yellow fixed inset-x-0 top-14 z-30 flex w-full items-center justify-between px-4 py-2 lg:hidden">
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

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

interface CountdownUnitProps {
	value: string;
	label: string;
}

function CountdownUnit({ value, label }: CountdownUnitProps) {
	return (
		<div className="flex flex-col items-center">
			<span className="text-lg font-semibold">{value}</span>
			<span className="text-3xs text-ink-500">{label}</span>
		</div>
	);
}
