'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { ComponentProps } from 'react';

interface SaveDraftModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onStay: () => void;
	onSaveDraft: () => void;
	onLeaveWithoutSaving: () => void;
}

/**
 * SaveDraftModal Component
 *
 * Confirmation modal displayed when user attempts to exit the form with unsaved changes.
 * Offers three actions: leave without saving, save draft and leave, or continue editing.
 */
export function SaveDraftModal({
	open,
	onOpenChange,
	onStay,
	onSaveDraft,
	onLeaveWithoutSaving,
}: SaveDraftModalProps) {
	function handleStay() {
		onStay();
		onOpenChange(false);
	}

	function handleSaveDraft() {
		onSaveDraft();
		onOpenChange(false);
	}

	function handleLeaveWithoutSaving() {
		onLeaveWithoutSaving();
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
						<PencilIcon />
					</div>
					<DialogTitle className="font-clash-display text-3xl">
						Leaving already?
					</DialogTitle>
					<DialogDescription className="max-w-md text-center text-black">
						Looks like you&apos;ve made some changes. Want to save this
						sweepstakes as a draft and come back later — or leave without
						saving?
					</DialogDescription>

					<div className="flex items-center gap-2 pt-6">
						<button
							onClick={handleLeaveWithoutSaving}
							className="rounded-full border border-black px-12 py-3 text-sm font-semibold text-black transition-colors"
						>
							Leave without saving
						</button>
						<button
							onClick={handleSaveDraft}
							className="text-background rounded-full border border-black bg-black px-12 py-3 text-sm font-semibold transition-colors"
						>
							Save draft & leave
						</button>
					</div>

					<button
						onClick={handleStay}
						className="text-sm font-semibold underline"
					>
						Continue editing
					</button>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}

function PencilIcon(props: ComponentProps<'svg'>) {
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
				d="M96.7032 25.1921L74.8059 3.29975C71.7442 0.237324 66.7794 0.237324 63.7176 3.29975L3.29805 63.7193C1.82117 65.1845 0.993399 67.1806 1.00004 69.261V91.1583C1.00004 95.4879 4.51012 98.9978 8.83973 98.998H91.1566C94.1741 98.995 96.0568 95.7265 94.5454 93.1148C93.8454 91.9051 92.5542 91.1597 91.1566 91.1583H41.8253L96.7032 36.2804C99.7656 33.2187 99.7656 28.2538 96.7032 25.1921ZM51.9581 26.1427L60.1359 34.3204L18.6394 75.817L10.4616 67.6392L51.9581 26.1427ZM8.83973 91.1583V77.1007L22.8973 91.1583H8.83973ZM32.3588 89.5364L24.1859 81.3587L65.6776 39.8621L73.8554 48.0399L32.3588 89.5364ZM79.397 42.4983L57.5047 20.601L69.2642 8.84142L91.1566 30.7387L79.397 42.4983Z"
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
