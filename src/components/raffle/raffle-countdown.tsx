'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';

/** Props for the live countdown timer displayed on raffle pages. */
interface RaffleCountdownProps {
	endAt: string;
}

/** Props for a single countdown unit (days, hours, minutes, seconds). */
interface CountdownUnitProps {
	value: number;
	label: string;
	isClosingSoon?: boolean;
}

/**
 * CountdownUnit Component
 *
 * Displays a single unit of time (days, hours, minutes, or seconds) with
 * animated transitions when the value changes.
 */
function CountdownUnit({
	value,
	label,
	isClosingSoon = false,
}: CountdownUnitProps) {
	/** Formats the value as a two-digit string for consistent column width. */
	function getFormattedValue(num: number): string {
		return String(num).padStart(2, '0');
	}

	/** Value text — amber-900 in closing-soon mode for urgency contrast. */
	function getValueClass(): string {
		const base = 'font-clash-display text-4xl font-semibold';
		return isClosingSoon ? `${base} text-amber-900` : base;
	}

	/** Label text — amber-700 in closing-soon, muted gray otherwise. */
	function getLabelClass(): string {
		return isClosingSoon ? 'text-sm text-amber-700' : 'text-sm text-[#7B7B7B]';
	}

	const formattedValue = getFormattedValue(value);

	return (
		<div className="flex flex-col items-center gap-2">
			<AnimatePresence mode="popLayout">
				<motion.p
					key={formattedValue}
					initial={{ y: -20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 20, opacity: 0 }}
					transition={{ duration: 0.3, ease: 'easeOut' }}
					className={getValueClass()}
				>
					{formattedValue}
				</motion.p>
			</AnimatePresence>
			<p className={getLabelClass()}>{label}</p>
		</div>
	);
}

/**
 * RaffleCountdown Component
 *
 * Displays a live countdown timer showing days, hours, minutes, and seconds
 * remaining until the raffle ends. Updates every second with smooth animations
 * for digit transitions.
 *
 * Features:
 * - Real-time countdown updated every second
 * - Smooth animations on value changes using framer-motion
 * - Handles expired raffles (shows "Time's up!" message)
 * - Automatic cleanup on component unmount
 */
export function RaffleCountdown({ endAt }: RaffleCountdownProps) {
	const { isClosingSoon, isExpired, isHydrated, ...timeRemaining } =
		useRaffleSaleWindow(endAt);

	/** Container classes — amber theme in final 10 minutes, green otherwise. */
	function getContainerClass(): string {
		const base = 'rounded-2xl p-4';
		return isClosingSoon
			? `${base} border border-amber-200 bg-amber-50`
			: `${base} bg-[#F6FF8B]`;
	}

	if (!isHydrated) return null;

	// Once expired, replace frozen zeros with a clear message
	if (isExpired) {
		return (
			<div className="flex items-center justify-center rounded-2xl bg-[#F6FF8B] p-4">
				<p className="font-clash-display text-2xl font-semibold">
					Time&apos;s up!
				</p>
			</div>
		);
	}

	return (
		<div className={getContainerClass()}>
			{isClosingSoon ? (
				<p className="mb-3 text-center text-xs font-semibold tracking-[0.2em] text-amber-700 uppercase">
					Final 10 minutes
				</p>
			) : null}
			<div className="flex items-center justify-center gap-4">
				<CountdownUnit
					value={timeRemaining.days}
					label="Days"
					isClosingSoon={isClosingSoon}
				/>
				<CountdownUnit
					value={timeRemaining.hours}
					label="Hours"
					isClosingSoon={isClosingSoon}
				/>
				<CountdownUnit
					value={timeRemaining.minutes}
					label="Minutes"
					isClosingSoon={isClosingSoon}
				/>
				<CountdownUnit
					value={timeRemaining.seconds}
					label="Seconds"
					isClosingSoon={isClosingSoon}
				/>
			</div>
		</div>
	);
}
