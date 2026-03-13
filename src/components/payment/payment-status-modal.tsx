'use client';

import { Copy } from 'lucide-react';
import { ComponentProps } from 'react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';

interface PaymentStatusModalProps {
	raffleId: string; // Can be publicSlug or raffleId - used for URL construction
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * PaymentStatusModal Component
 *
 * Displays the post-Stripe success UI after redirect.
 * The polling implementation was removed; this component is now static and purely presentational.
 */
export function PaymentStatusModal({
	raffleId,
	open,
	onOpenChange,
}: PaymentStatusModalProps) {
	/** Ticket icon SVG for the payment success modal. */
	function renderTicketIcon(props?: ComponentProps<'svg'>): React.ReactNode {
		return (
			<svg
				width="104"
				height="74"
				viewBox="0 0 104 74"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				{...props}
			>
				<path
					d="M100.286 25.9C102.337 25.9 104 24.2435 104 22.2V7.4C104 3.31311 100.674 0 96.5714 0H7.42857C3.3259 0 0 3.31311 0 7.4V22.2C0 24.2435 1.66289 25.9001 3.71429 25.9C12.292 25.9004 17.6533 35.1506 13.364 42.5504C11.3736 45.9844 7.69487 48.0998 3.71429 48.1C1.66293 48.1 0 49.7565 0 51.8V66.6C0 70.6871 3.32574 74.0002 7.42857 74H96.5714C100.674 74.0002 104 70.6871 104 66.6V51.8C104 49.7565 102.337 48.1 100.286 48.1C91.708 48.0996 86.3467 38.8494 90.6359 31.4496C92.6264 28.0156 96.3051 25.9002 100.286 25.9ZM7.42857 55.13C21.4389 52.296 27.1157 35.4164 17.6467 24.7468C14.9725 21.7335 11.3854 19.6704 7.42857 18.87V7.4H33.4286V66.6H7.42857V55.13ZM96.5714 55.13V66.6H40.8571V7.4H96.5714V18.87C82.5611 21.704 76.8843 38.5836 86.3533 49.2532C89.0275 52.2666 92.6146 54.3296 96.5714 55.13Z"
					fill="black"
				/>
			</svg>
		);
	}

	/** Decorative colored shapes rendered at the top-left of the success modal. */
	function renderLeftColoredCard(
		props?: ComponentProps<'svg'>,
	): React.ReactNode {
		return (
			<svg
				width="260"
				height="310"
				viewBox="0 0 260 310"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				{...props}
			>
				<path
					d="M98.6845 -13.471C93.3861 -13.5194 89.0448 -9.45478 88.988 -4.3925L87.3677 140.035C87.3109 145.098 91.5601 149.241 96.8585 149.289L248.025 150.669C253.323 150.718 257.664 146.653 257.721 141.591L259.342 -2.83684C259.398 -7.89912 255.149 -12.0421 249.851 -12.0905L98.6845 -13.471Z"
					fill="#C4EDFF"
				/>
				<path
					d="M-13.1583 42.0779C-18.3784 42.9529 -21.8726 47.7045 -20.9629 52.6908L12.2685 234.828C13.1782 239.814 18.1475 243.147 23.3675 242.272L214.043 210.311C219.263 209.436 222.758 204.685 221.848 199.698L188.617 17.5611C187.707 12.5748 182.738 9.24188 177.517 10.1169L-13.1583 42.0779Z"
					fill="#BEFFDB"
				/>
				<path
					d="M35.0622 90.1197C31.3558 86.506 25.2814 86.4505 21.4947 89.9958L-86.5417 191.146C-90.3285 194.691 -90.3936 200.495 -86.6872 204.108L19.0578 307.21C22.7642 310.824 28.8386 310.88 32.6253 307.334L140.662 206.185C144.448 202.639 144.514 196.836 140.807 193.222L35.0622 90.1197Z"
					fill="#F6FF8B"
				/>
			</svg>
		);
	}

	/** Decorative colored shapes rendered at the top-right of the success modal. */
	function renderRightColoredCard(
		props?: ComponentProps<'svg'>,
	): React.ReactNode {
		return (
			<svg
				width="259"
				height="312"
				viewBox="0 0 259 312"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				{...props}
			>
				<path
					d="M160.657 -11.5633C165.956 -11.6116 170.297 -7.54707 170.354 -2.48479L171.974 141.943C172.031 147.005 167.782 151.148 162.483 151.197L11.3171 152.577C6.01861 152.626 1.6773 148.561 1.6205 143.499L0.000196564 -0.929127C-0.0566037 -5.99141 4.19263 -10.1344 9.49109 -10.1828L160.657 -11.5633Z"
					fill="#C4EDFF"
				/>
				<path
					d="M272.5 43.9856C277.72 44.8606 281.214 49.6122 280.305 54.5985L247.073 236.736C246.164 241.722 241.194 245.055 235.974 244.18L45.2985 212.219C40.0784 211.344 36.5842 206.592 37.494 201.606L70.7253 19.4688C71.6351 14.4825 76.6043 11.1496 81.8243 12.0246L272.5 43.9856Z"
					fill="#BEFFDB"
				/>
				<path
					d="M224.28 92.0275C227.986 88.4137 234.06 88.3582 237.847 91.9035L345.884 193.053C349.67 196.599 349.735 202.402 346.029 206.016L240.284 309.118C236.578 312.732 230.503 312.787 226.716 309.242L118.68 208.092C114.893 204.547 114.828 198.743 118.535 195.129L224.28 92.0275Z"
					fill="#F6FF8B"
				/>
			</svg>
		);
	}

	/** Copies the raffle link to the clipboard */
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl border border-[#0F0F0FF2] py-24">
				{renderLeftColoredCard({ className: 'absolute top-0 left-0' })}
				{renderRightColoredCard({ className: 'absolute top-0 right-0' })}

				<DialogHeader className="z-1 flex items-center justify-center space-y-2">
					<div className="flex justify-center pb-4">{renderTicketIcon()}</div>
					<DialogTitle className="font-clash-display text-3xl">
						Tickets confirmed. <br />
						You’re officially in!
					</DialogTitle>
					<DialogDescription className="text-center text-black">
						Thanks for joining this raffle — your entry has been recorded.{' '}
						<br />
						Winners will be announced once the draw closes.
					</DialogDescription>

					<div className="my-6">
						<Link
							href="/my-raffles"
							className="rounded-full border border-black px-12 py-3 text-sm font-semibold"
						>
							View my raffles
						</Link>
					</div>
				</DialogHeader>
				<div className="z-1 flex w-full flex-col items-center justify-center gap-4">
					<p className="text-xl font-medium">Share your raffle!</p>
					<div className="flex items-center justify-center gap-8">
						<button
							type="button"
							onClick={handleShare}
							className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black"
						>
							<FaXTwitter className="h-4 w-4" />
							Share on X
						</button>
						<button
							type="button"
							onClick={handleCopyLink}
							className="flex items-center justify-center gap-2 text-sm font-medium"
						>
							<Copy className="h-4 w-4" />
							Copy Raffle link
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
