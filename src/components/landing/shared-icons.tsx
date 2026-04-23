import { CheckIcon } from 'lucide-react';

/**
 * Decorative diamond icon — shared by participant-section and host-section.
 * Four rotated squares forming a diamond pattern.
 *
 * @returns SVG diamond icon, responsive sizing via Tailwind classes
 */
export function DiamondIcon() {
	return (
		<svg
			width="201"
			height="201"
			viewBox="0 0 201 201"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="size-32 lg:size-50.25"
		>
			<path
				d="M100.5 0L150.75 50.25L100.5 100.5L50.25 50.25L100.5 0Z"
				fill="black"
			/>
			<path
				d="M100.5 100.5L150.75 150.75L100.5 201L50.25 150.75L100.5 100.5Z"
				fill="black"
			/>
			<path
				d="M0 100.5L50.25 50.25L100.5 100.5L50.25 150.75L0 100.5Z"
				fill="black"
			/>
			<path
				d="M100.5 100.5L150.75 50.25L201 100.5L150.75 150.75L100.5 100.5Z"
				fill="black"
			/>
		</svg>
	);
}

/**
 * Checkmark icon for feature lists — shared by participant-section and host-section.
 * Wraps lucide CheckIcon in a fixed-size container for consistent list alignment.
 *
 * @returns Checkmark icon in a 24x24 container
 */
export function CheckmarkIcon() {
	return (
		<div className="flex size-6 shrink-0 items-center justify-center">
			<CheckIcon className="size-5 text-black" strokeWidth={3} />
		</div>
	);
}
