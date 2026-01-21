import Link from 'next/link';
import { ComponentProps } from 'react';

/**
 * Footer component with links and copyright
 */
export function Footer() {
	return (
		<footer className="relative overflow-hidden px-6 py-20 lg:px-[108px]">
			{/* Decorative background shapes */}
			<LeftColoredCards className="absolute bottom-0 left-0 origin-bottom-left scale-[.75]" />
			<RightColoredCards className="absolute right-0 bottom-0" />

			<div className="relative z-10 mx-auto max-w-[1720px] text-center">
				<div className="mb-4 flex flex-col items-center gap-2">
					<Link
						href="/support"
						className="text-lg font-medium text-black underline"
					>
						Support
					</Link>
					<Link
						href="/terms"
						className="text-lg font-medium text-black underline"
					>
						Terms of Service
					</Link>
				</div>
				<p className="text-lg leading-8 font-medium tracking-wide text-[#7b7b7b]">
					Rafli is a subsidiary of the EARN&apos;M Foundation
					<br />
					Copyright ©2026 — Rafli, Inc — All rights reserved.
				</p>
			</div>
		</footer>
	);
}

function LeftColoredCards(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="625"
			height="470"
			viewBox="0 0 625 470"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M300.95 611.487C288.147 614.918 274.987 607.32 271.556 594.517L189.599 288.649C186.168 275.845 193.766 262.685 206.569 259.255L512.437 177.298C525.241 173.867 538.401 181.465 541.831 194.268L623.788 500.136C627.219 512.939 619.621 526.099 606.818 529.53L300.95 611.487Z"
				fill="#C4EDFF"
			/>
			<path
				d="M-11.6833 551.311C-24.8973 552.351 -36.4523 542.482 -37.4922 529.268L-69.4503 123.163C-70.4901 109.949 -60.621 98.3942 -47.4071 97.3543L358.698 65.3963C371.912 64.3564 383.467 74.2255 384.506 87.4395L416.465 493.544C417.504 506.758 407.635 518.313 394.421 519.353L-11.6833 551.311Z"
				fill="#BEFFDB"
			/>
			<path
				d="M19.8027 468.567C13.1753 480.046 -1.50285 483.979 -12.9819 477.351L-287.216 319.022C-298.695 312.395 -302.628 297.717 -296 286.238L-137.671 12.004C-131.044 0.524973 -116.366 -3.40798 -104.887 3.21943L169.347 161.548C180.826 168.176 184.759 182.854 178.132 194.333L19.8027 468.567Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}

function RightColoredCards(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="466"
			height="222"
			viewBox="0 0 466 222"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M412.191 347.187C408.761 359.99 395.6 367.588 382.797 364.157L225.401 321.983C212.598 318.553 205 305.392 208.431 292.589L250.605 135.193C254.035 122.39 267.196 114.792 279.999 118.223L437.395 160.397C450.198 163.827 457.796 176.988 454.365 189.791L412.191 347.187Z"
				fill="#C4EDFF"
			/>
			<path
				d="M500.085 219.271C494.379 231.235 480.055 236.307 468.091 230.601L342.881 170.878C330.917 165.171 325.845 150.847 331.551 138.883L391.275 13.6732C396.981 1.70963 411.305 -3.3628 423.269 2.34364L548.479 62.0669C560.443 67.7734 565.515 82.0978 559.809 94.0613L500.085 219.271Z"
				fill="#BEFFDB"
			/>
			<path
				d="M267.38 283.913C274.007 295.392 270.074 310.071 258.595 316.698L117.478 398.172C105.999 404.8 91.3207 400.867 84.6933 389.388L3.21912 248.27C-3.40829 236.791 0.524704 222.113 12.0037 215.486L153.121 134.011C164.6 127.384 179.278 131.317 185.906 142.796L267.38 283.913Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}
