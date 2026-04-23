'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { ComponentProps } from 'react';

interface RestoreDraftModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onContinueDraft: () => void;
	onStartFresh: () => void;
}

/**
 * Modal displayed when the user visits the create page and a saved draft exists.
 * Asks whether to continue from where they left off or start a new raffle from scratch.
 *
 * @returns A dialog with two action buttons
 */
export function RestoreDraftModal({
	open,
	onOpenChange,
	onContinueDraft,
	onStartFresh,
}: RestoreDraftModalProps) {
	function handleContinueDraft() {
		onContinueDraft();
		onOpenChange(false);
	}

	function handleStartFresh() {
		onStartFresh();
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="border-ink-alpha max-w-2xl border py-24"
				showCloseButton={false}
			>
				<ColoredCards className="absolute right-0 bottom-0" />

				<DialogHeader className="z-1 flex flex-col items-center justify-center gap-2">
					<div className="flex justify-center pb-4">
						<DraftIcon />
					</div>
					<DialogTitle className="font-clash-display text-3xl">
						Welcome back!
					</DialogTitle>
					<DialogDescription className="max-w-md text-center text-black">
						You have a saved draft from last time. Would you like to continue
						where you left off or start a new sweepstakes from scratch?
					</DialogDescription>

					<div className="flex items-center gap-2 pt-6">
						<button
							onClick={handleStartFresh}
							className="rounded-full border border-black px-12 py-3 text-sm font-semibold text-black transition-colors"
						>
							Start from scratch
						</button>
						<button
							onClick={handleContinueDraft}
							className="text-background rounded-full border border-black bg-black px-12 py-3 text-sm font-semibold transition-colors"
						>
							Continue where I left off
						</button>
					</div>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}

function DraftIcon(props: ComponentProps<'svg'>) {
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
				d="M83.3333 12.5H16.6667C14.4565 12.5 12.337 13.3780 10.7742 14.9408C9.21131 16.5036 8.33334 18.6232 8.33334 20.8333V79.1667C8.33334 81.3768 9.21131 83.4964 10.7742 85.0592C12.337 86.622 14.4565 87.5 16.6667 87.5H83.3333C85.5435 87.5 87.663 86.622 89.2259 85.0592C90.7887 83.4964 91.6667 81.3768 91.6667 79.1667V20.8333C91.6667 18.6232 90.7887 16.5036 89.2259 14.9408C87.663 13.3780 85.5435 12.5 83.3333 12.5ZM83.3333 79.1667H16.6667V20.8333H83.3333V79.1667Z"
				fill="black"
			/>
			<path d="M25 33.3333H75V41.6667H25V33.3333Z" fill="black" />
			<path d="M25 50H75V58.3333H25V50Z" fill="black" />
			<path d="M25 66.6667H54.1667V75H25V66.6667Z" fill="black" />
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
