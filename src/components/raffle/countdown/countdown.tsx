'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';
import { cn } from '@/lib/class-names';

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
	const formattedValue = String(value).padStart(2, '0');

	return (
		<div className="flex flex-col items-center gap-2">
			<AnimatePresence mode="popLayout">
				<motion.p
					key={formattedValue}
					initial={{ y: -20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 20, opacity: 0 }}
					transition={{ duration: 0.3, ease: 'easeOut' }}
					className={cn(
						'font-clash-display text-4xl font-semibold',
						isClosingSoon && 'text-amber-900',
					)}
				>
					{formattedValue}
				</motion.p>
			</AnimatePresence>
			<p
				className={
					isClosingSoon ? 'text-sm text-amber-700' : 'text-ink-500 text-sm'
				}
			>
				{label}
			</p>
		</div>
	);
}

/**
 * Same-height placeholder for the SSR / pre-hydration paint so the countdown
 * card reserves its final layout box. `aria-hidden` because screen readers
 * announce the live unit values once hydration completes.
 *
 * @returns Static skeleton matching the live countdown frame
 */
function CountdownSkeleton() {
	return (
		<div aria-hidden className="bg-brand-yellow rounded-2xl p-4">
			<div className="flex items-center justify-center gap-4">
				<CountdownUnitPlaceholder label="Days" />
				<CountdownUnitPlaceholder label="Hours" />
				<CountdownUnitPlaceholder label="Minutes" />
				<CountdownUnitPlaceholder label="Seconds" />
			</div>
		</div>
	);
}

interface CountdownUnitPlaceholderProps {
	label: string;
}

function CountdownUnitPlaceholder({ label }: CountdownUnitPlaceholderProps) {
	return (
		<div className="flex flex-col items-center gap-2">
			<p className="font-clash-display text-4xl font-semibold opacity-30">--</p>
			<p className="text-ink-500 text-sm">{label}</p>
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

	// Pre-hydration: render the card frame with placeholder digits so the
	// SSR paint reserves the final height. Returning null here previously
	// collapsed the countdown to zero height, then expanded on hydration —
	// visible CLS. Server and client both render the same placeholders so
	// no hydration mismatch (real digits only swap in via `isHydrated`).
	if (!isHydrated) return <CountdownSkeleton />;

	// Once expired, replace frozen zeros with a clear message
	if (isExpired) {
		return (
			<div className="bg-brand-yellow flex items-center justify-center rounded-2xl p-4">
				<p className="font-clash-display text-2xl font-semibold">
					Time&apos;s up!
				</p>
			</div>
		);
	}

	return (
		<div
			className={
				isClosingSoon
					? 'rounded-2xl border border-amber-200 bg-amber-50 p-4'
					: 'bg-brand-yellow rounded-2xl p-4'
			}
		>
			{isClosingSoon ? (
				<p className="tracking-caps-6 mb-3 text-center text-xs font-semibold text-amber-700 uppercase">
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
