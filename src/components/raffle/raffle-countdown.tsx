'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { differenceInSeconds, intervalToDuration } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

interface RaffleCountdownProps {
	endAt: string;
}

interface TimeRemaining {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	isExpired: boolean;
}

/**
 * Calculates time remaining from now until the end date
 * @param endDateString - ISO datetime string for raffle end
 * @returns Object with days, hours, minutes, seconds, and expiration status
 */
function calculateTimeRemaining(endDateString: string): TimeRemaining {
	const now = new Date();
	const end = new Date(endDateString);
	const secondsRemaining = differenceInSeconds(end, now);

	if (secondsRemaining <= 0) {
		return {
			days: 0,
			hours: 0,
			minutes: 0,
			seconds: 0,
			isExpired: true,
		};
	}

	const duration = intervalToDuration({ start: now, end });

	return {
		days: duration.days || 0,
		hours: duration.hours || 0,
		minutes: duration.minutes || 0,
		seconds: duration.seconds || 0,
		isExpired: false,
	};
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
 * - Handles expired raffles (shows 00:00:00:00)
 * - Automatic cleanup on component unmount
 */
export function RaffleCountdown({ endAt }: RaffleCountdownProps) {
	const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
		calculateTimeRemaining(endAt)
	);

	/**
	 * Updates the countdown timer state
	 */
	const updateCountdown = useCallback(() => {
		setTimeRemaining(calculateTimeRemaining(endAt));
	}, [endAt]);

	// Update countdown every second
	useEffect(() => {
		// Set up interval for updates
		const interval = setInterval(updateCountdown, 1_000);

		// Cleanup on unmount
		return () => clearInterval(interval);
	}, [updateCountdown]);

	return (
		<div className="flex items-center justify-center gap-4 rounded-2xl bg-[#DFFFED] p-4">
			<CountdownUnit
				value={timeRemaining.days}
				label="Days"
			/>
			<CountdownUnit
				value={timeRemaining.hours}
				label="Hours"
			/>
			<CountdownUnit
				value={timeRemaining.minutes}
				label="Minutes"
			/>
			<CountdownUnit
				value={timeRemaining.seconds}
				label="Seconds"
			/>
		</div>
	);
}

interface CountdownUnitProps {
	value: number;
	label: string;
}

/**
 * CountdownUnit Component
 *
 * Displays a single unit of time (days, hours, minutes, or seconds) with
 * animated transitions when the value changes.
 */
function CountdownUnit({ value, label }: CountdownUnitProps) {
	/**
	 * Formats the value as a two-digit string
	 * @param num - The number to format
	 * @returns Two-digit string representation
	 */
	function getFormattedValue(num: number): string {
		return String(num).padStart(2, '0');
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
					className="font-clash-display text-4xl font-semibold"
				>
					{formattedValue}
				</motion.p>
			</AnimatePresence>
			<p className="text-sm text-[#7B7B7B]">{label}</p>
		</div>
	);
}
