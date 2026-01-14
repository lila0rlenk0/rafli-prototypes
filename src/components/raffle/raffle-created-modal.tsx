'use client';

import { Copy } from 'lucide-react';
import Link from 'next/link';
import { ComponentProps } from 'react';
import { FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

interface RaffleCreatedModalProps {
	raffleId: string;
	raffleStartDate: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * RaffleCreatedModal Component
 *
 * Displays success message after creating a raffle.
 * Shows different content based on whether the start date is today or in the future.
 * When start date is today, includes share functionality.
 */
export function RaffleCreatedModal({
	raffleId,
	raffleStartDate,
	open,
	onOpenChange,
}: RaffleCreatedModalProps) {
	/**
	 * Checks if the start date is today
	 * Normalizes both dates to local midnight to avoid timezone issues
	 * @param startDate - The start date string (format: YYYY-MM-DD)
	 * @returns true if start date is today, false otherwise
	 */
	function checkIfStartDateIsToday(startDate: string): boolean {
		if (!startDate) return false;

		// Parse the date string and normalize to local midnight
		const [year, month, day] = startDate.split('-').map(Number);
		const start = new Date(year, month - 1, day);

		// Get today's date normalized to local midnight
		const today = new Date();
		const todayNormalized = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
		);

		// Compare year, month, and day only (both normalized to local midnight)
		return (
			start.getFullYear() === todayNormalized.getFullYear() &&
			start.getMonth() === todayNormalized.getMonth() &&
			start.getDate() === todayNormalized.getDate()
		);
	}

	/**
	 * Formats the start date for display
	 * @param dateString - The start date string
	 * @returns Formatted date string (e.g., "12 December")
	 */
	function formatStartDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'long',
		});
	}

	const isStartDateToday = checkIfStartDateIsToday(raffleStartDate);
	const formattedStartDate = formatStartDate(raffleStartDate);

	/**
	 * Copies the raffle link to the clipboard
	 */
	function handleCopyLink() {
		const link = `${window.location.origin}/browse/${raffleId}`;
		navigator.clipboard.writeText(link);
		toast.success('Raffle link copied to clipboard!');
	}

	/**
	 * Opens a Twitter/X share intent in a new tab
	 */
	function handleShare() {
		const text = 'Check out this raffle';
		const link = `${window.location.origin}/browse/${raffleId}`;
		const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
		window.open(url, '_blank');
	}

	function handleOpenChange(newOpen: boolean) {
		onOpenChange(newOpen);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-2xl border border-[#0F0F0FF2] py-24">
				<ColoredCards className="absolute right-0 bottom-0" />

				<DialogHeader className="z-1 flex items-center justify-center space-y-2">
					<div className="flex justify-center pb-4">
						{isStartDateToday ? <SuccessCheckIcon /> : <PauseIcon />}
					</div>
					<DialogTitle className="font-clash-display text-3xl">
						{isStartDateToday
							? 'Your raffle is live!'
							: 'All set! Your raffle is in the queue'}
					</DialogTitle>
					<DialogDescription className="max-w-md text-center text-black">
						{isStartDateToday ? (
							<>
								Everything&apos;s set — participants can now join and start
								buying tickets. Track entries and engagement from your
								dashboard.
							</>
						) : (
							<>
								Your raffle has been saved as a draft and will go live on{' '}
								{formattedStartDate}. You can review or edit it anytime before
								it starts.
							</>
						)}
					</DialogDescription>

					<div className="my-6">
						<Link
							href="/my-raffles"
							className="rounded-full border border-black px-12 py-3 text-sm font-semibold text-black transition-colors"
						>
							View my raffles
						</Link>
					</div>
				</DialogHeader>
				{isStartDateToday && (
					<div className="z-1 flex w-full flex-col items-center justify-center gap-4">
						<p className="text-xl font-medium">Share your raffle!</p>
						<div className="flex items-center justify-center gap-8">
							<button
								onClick={handleShare}
								className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black"
							>
								<FaXTwitter className="h-4 w-4" />
								Share on X
							</button>
							<button
								onClick={handleCopyLink}
								className="flex items-center justify-center gap-2 text-sm font-medium"
							>
								<Copy className="h-4 w-4" />
								Copy Raffle link
							</button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function SuccessCheckIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="100"
			height="100"
			viewBox="0 0 100 100"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M93.6875 38.7589C92.0045 37 90.2634 35.1875 89.6071 33.5937C89 32.1339 88.9643 29.7143 88.9286 27.3705C88.8616 23.0134 88.7902 18.0759 85.3571 14.6429C81.9241 11.2098 76.9866 11.1384 72.6295 11.0714C70.2857 11.0357 67.8661 11 66.4062 10.3929C64.817 9.73661 63 7.99553 61.2411 6.3125C58.1607 3.35268 54.6607 0 50 0C45.3393 0 41.8438 3.35268 38.7589 6.3125C37 7.99553 35.1875 9.73661 33.5937 10.3929C32.1429 11 29.7143 11.0357 27.3705 11.0714C23.0134 11.1384 18.0759 11.2098 14.6429 14.6429C11.2098 18.0759 11.1607 23.0134 11.0714 27.3705C11.0357 29.7143 11 32.1339 10.3929 33.5937C9.73661 35.183 7.99553 37 6.3125 38.7589C3.35268 41.8393 0 45.3393 0 50C0 54.6607 3.35268 58.1562 6.3125 61.2411C7.99553 63 9.73661 64.8125 10.3929 66.4062C11 67.8661 11.0357 70.2857 11.0714 72.6295C11.1384 76.9866 11.2098 81.9241 14.6429 85.3571C18.0759 88.7902 23.0134 88.8616 27.3705 88.9286C29.7143 88.9643 32.1339 89 33.5937 89.6071C35.183 90.2634 37 92.0045 38.7589 93.6875C41.8393 96.6473 45.3393 100 50 100C54.6607 100 58.1562 96.6473 61.2411 93.6875C63 92.0045 64.8125 90.2634 66.4062 89.6071C67.8661 89 70.2857 88.9643 72.6295 88.9286C76.9866 88.8616 81.9241 88.7902 85.3571 85.3571C88.7902 81.9241 88.8616 76.9866 88.9286 72.6295C88.9643 70.2857 89 67.8661 89.6071 66.4062C90.2634 64.817 92.0045 63 93.6875 61.2411C96.6473 58.1607 100 54.6607 100 50C100 45.3393 96.6473 41.8438 93.6875 38.7589ZM88.5312 56.2991C86.3929 58.5312 84.1786 60.8393 83.0045 63.6741C81.8795 66.3973 81.8304 69.5089 81.7857 72.5223C81.7411 75.6473 81.692 78.9196 80.3036 80.3036C78.9152 81.6875 75.6652 81.7411 72.5223 81.7857C69.5089 81.8304 66.3973 81.8795 63.6741 83.0045C60.8393 84.1786 58.5312 86.3929 56.2991 88.5312C54.067 90.6696 51.7857 92.8571 50 92.8571C48.2143 92.8571 45.9152 90.6607 43.7009 88.5312C41.4866 86.4018 39.1607 84.1786 36.3259 83.0045C33.6027 81.8795 30.4911 81.8304 27.4777 81.7857C24.3527 81.7411 21.0804 81.692 19.6964 80.3036C18.3125 78.9152 18.2589 75.6652 18.2143 72.5223C18.1696 69.5089 18.1205 66.3973 16.9955 63.6741C15.8214 60.8393 13.6071 58.5312 11.4687 56.2991C9.33036 54.067 7.14286 51.7857 7.14286 50C7.14286 48.2143 9.33928 45.9152 11.4687 43.7009C13.5982 41.4866 15.8214 39.1607 16.9955 36.3259C18.1205 33.6027 18.1696 30.4911 18.2143 27.4777C18.2589 24.3527 18.308 21.0804 19.6964 19.6964C21.0848 18.3125 24.3348 18.2589 27.4777 18.2143C30.4911 18.1696 33.6027 18.1205 36.3259 16.9955C39.1607 15.8214 41.4687 13.6071 43.7009 11.4687C45.933 9.33036 48.2143 7.14286 50 7.14286C51.7857 7.14286 54.0848 9.33928 56.2991 11.4687C58.5134 13.5982 60.8393 15.8214 63.6741 16.9955C66.3973 18.1205 69.5089 18.1696 72.5223 18.2143C75.6473 18.2589 78.9196 18.308 80.3036 19.6964C81.6875 21.0848 81.7411 24.3348 81.7857 27.4777C81.8304 30.4911 81.8795 33.6027 83.0045 36.3259C84.1786 39.1607 86.3929 41.4687 88.5312 43.7009C90.6696 45.933 92.8571 48.2143 92.8571 50C92.8571 51.7857 90.6607 54.0848 88.5312 56.2991ZM70.3839 36.7589C71.7805 38.154 71.7805 40.4174 70.3839 41.8125L45.3839 66.8125C43.9889 68.2091 41.7254 68.2091 40.3304 66.8125L29.6161 56.0982C27.671 54.1531 28.5609 50.8317 31.218 50.1198C32.4511 49.7893 33.7669 50.1419 34.6696 51.0446L42.8571 59.2366L65.3304 36.7589C66.7254 35.3623 68.9889 35.3623 70.3839 36.7589Z"
				fill="black"
			/>
		</svg>
	);
}

function PauseIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="86"
			height="94"
			viewBox="0 0 86 94"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M78.1818 0H58.6364C54.3185 0 50.8182 3.47054 50.8182 7.75171V85.2687C50.8182 89.55 54.3184 93.0206 58.6364 93.0204H78.1818C82.4995 93.0202 86 89.5497 86 85.2687V7.75171C86 3.47054 82.4997 0 78.1818 0ZM78.1818 85.2687H58.6364V7.75171H78.1818V85.2687ZM27.3637 0H7.81819C3.50034 0 0 3.47054 0 7.75171V85.2687C0 89.55 3.50019 93.0206 7.81819 93.0204H27.3637C31.6814 93.0202 35.1818 89.5497 35.1818 85.2687V7.75171C35.1818 3.47054 31.6815 0 27.3637 0ZM27.3637 85.2687H7.81819V7.75171H27.3637V85.2687Z"
				fill="black"
			/>
		</svg>
	);
}

function ColoredCards(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="393"
			height="234"
			viewBox="0 0 393 234"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M412.192 347.187C408.762 359.99 395.601 367.588 382.798 364.157L225.402 321.983C212.599 318.553 205.001 305.393 208.432 292.59L250.606 135.194C254.036 122.39 267.196 114.792 280 118.223L437.396 160.397C450.199 163.828 457.797 176.988 454.366 189.791L412.192 347.187Z"
				fill="#C4EDFF"
			/>
			<path
				d="M500.086 219.272C494.38 231.235 480.056 236.308 468.092 230.601L342.882 170.878C330.918 165.171 325.846 150.847 331.552 138.883L391.276 13.6734C396.982 1.70985 411.306 -3.36259 423.27 2.34386L548.48 62.0671C560.444 67.7736 565.516 82.098 559.81 94.0616L500.086 219.272Z"
				fill="#BEFFDB"
			/>
			<path
				d="M267.381 283.914C274.008 295.393 270.075 310.071 258.596 316.698L117.479 398.172C106 404.8 91.3217 400.867 84.6943 389.388L3.2201 248.27C-3.40731 236.791 0.52568 222.113 12.0047 215.486L153.122 134.012C164.601 127.384 179.279 131.317 185.907 142.796L267.381 283.914Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}
