'use client';

import { differenceInSeconds } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
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
	/**
	 * Calculates time remaining from now until the end date
	 * Uses date-fns for precise second-level diffing and duration decomposition
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

		const days = Math.floor(secondsRemaining / 86_400);
		const hours = Math.floor((secondsRemaining % 86_400) / 3_600);
		const minutes = Math.floor((secondsRemaining % 3_600) / 60);
		const seconds = secondsRemaining % 60;

		return { days, hours, minutes, seconds, isExpired: false };
	}

	const [mounted, setMounted] = useState(false);
	const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
		calculateTimeRemaining(endAt),
	);

	useEffect(() => {
		if (mounted) return;

		setTimeout(() => {
			setMounted(true);
		}, 0);
	}, [mounted]);

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

	if (!mounted) return null;

	// Once expired, replace frozen zeros with a clear message
	if (timeRemaining.isExpired) {
		return (
			<div className="flex items-center justify-center rounded-2xl bg-[#DFFFED] p-4">
				<p className="font-clash-display text-2xl font-semibold">
					Time&apos;s up!
				</p>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center gap-4 rounded-2xl bg-[#DFFFED] p-4">
			<CountdownUnit value={timeRemaining.days} label="Days" />
			<CountdownUnit value={timeRemaining.hours} label="Hours" />
			<CountdownUnit value={timeRemaining.minutes} label="Minutes" />
			<CountdownUnit value={timeRemaining.seconds} label="Seconds" />
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
