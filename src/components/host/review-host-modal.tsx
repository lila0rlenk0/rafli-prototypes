'use client';

import { Copy } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useCreateReview } from '@/services/review/use-create-review';

import { InteractiveStarRating } from './interactive-star-rating';

interface ReviewHostModalProps {
	/** Whether the modal is open */
	open: boolean;
	/** Callback when modal open state changes */
	onOpenChange: (open: boolean) => void;
	/** The raffle ID to review */
	raffleId: string;
	/** The host ID being reviewed */
	hostId: string;
	/** Public slug for sharing */
	publicSlug: string;
}

/**
 * ReviewHostModal Component
 *
 * Modal for raffle winners to review hosts.
 * Shows form state initially, then success state after submission.
 */
export function ReviewHostModal({
	open,
	onOpenChange,
	raffleId,
	hostId,
	publicSlug,
}: ReviewHostModalProps) {
	const [rating, setRating] = useState(0);
	const [isSuccess, setIsSuccess] = useState(false);
	const reviewMutation = useCreateReview();

	/**
	 * Handles review form submission
	 */
	function handleSubmit() {
		if (rating === 0) {
			toast.error('Please select a rating');
			return;
		}

		reviewMutation.mutate(
			{ raffleId, hostId, rating },
			{
				onSuccess() {
					setIsSuccess(true);
				},
				onError() {
					toast.error('Failed to submit review. Please try again.');
				},
			},
		);
	}

	/**
	 * Copies the raffle link to clipboard
	 */
	function handleCopyLink() {
		const link = `${window.location.origin}/browse/${publicSlug}`;
		navigator.clipboard.writeText(link);
		toast.success('Raffle link copied to clipboard!');
	}

	/**
	 * Opens Twitter/X share intent
	 */
	function handleShare() {
		const text = 'I just won a raffle! Check it out';
		const link = `${window.location.origin}/browse/${publicSlug}`;
		const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
		window.open(url, '_blank');
	}

	/**
	 * Resets modal state when closed
	 */
	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			// Reset state after close animation
			setTimeout(() => {
				setRating(0);
				setIsSuccess(false);
			}, 200);
		}
		onOpenChange(newOpen);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-2xl border border-[#0F0F0FF2] py-16">
				<LeftColoredCard className="absolute top-0 left-0" />
				<RightColoredCard className="absolute top-0 right-0" />

				<DialogHeader className="z-1 flex items-center justify-center space-y-2">
					<div className="flex justify-center pb-4">
						<PartyPopperIcon />
					</div>
					<DialogTitle className="font-clash-display text-center text-3xl">
						Congratulations!
						<br />
						You won a raffle!
					</DialogTitle>

					{isSuccess ? (
						<>
							<DialogDescription className="text-center text-lg font-medium text-black">
								Thanks — your feedback helps keep raffles fair
							</DialogDescription>
							<p className="text-center text-sm text-gray-600">
								You can update your rating once the prize arrives
							</p>
						</>
					) : (
						<>
							<DialogDescription className="text-center text-lg font-medium text-black">
								How has your experience with the host been so far?
							</DialogDescription>
							<p className="text-center text-sm text-gray-600">
								Your feedback helps keep hosts trustworthy — you can update this
								after delivery.
							</p>

							<div className="flex justify-center py-4">
								<InteractiveStarRating
									rating={rating}
									onChange={setRating}
									disabled={reviewMutation.isPending}
								/>
							</div>

							<button
								onClick={handleSubmit}
								disabled={reviewMutation.isPending || rating === 0}
								className="rounded-full border border-black px-12 py-3 text-sm font-semibold transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
							>
								{reviewMutation.isPending ? 'Submitting...' : 'Leave review'}
							</button>
						</>
					)}
				</DialogHeader>

				<div className="z-1 mt-6 flex w-full flex-col items-center justify-center gap-4">
					<p className="text-lg font-medium">Tell everyone about your win!</p>
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
			</DialogContent>
		</Dialog>
	);
}

/**
 * Party Popper Icon
 */
function PartyPopperIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="58"
			height="58"
			viewBox="0 0 58 58"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M21.3353 11.984C20.8307 11.4808 20.2074 11.1128 19.5229 10.9139C18.8385 10.715 18.115 10.6917 17.4192 10.8461C16.7233 11.0004 16.0776 11.3276 15.5416 11.7972C15.0056 12.2669 14.5965 12.8639 14.3521 13.5333L0.254099 52.302C0.0225023 52.9414 -0.0523065 53.6269 0.0359524 54.3011C0.124211 54.9753 0.372963 55.6185 0.761324 56.1767C1.14969 56.7349 1.66632 57.1918 2.26787 57.5091C2.86942 57.8263 3.53831 57.9947 4.21841 58C4.71915 57.9966 5.21544 57.9057 5.68489 57.7315L44.4605 43.6343C45.1302 43.3903 45.7277 42.9815 46.1978 42.4457C46.6679 41.91 46.9954 41.2645 47.1501 40.5688C47.3047 39.8731 47.2817 39.1496 47.0829 38.4652C46.8842 37.7808 46.5162 37.1575 46.0129 36.6528L21.3353 11.984ZM19.098 48.2904L9.69754 38.8922L13.2321 29.1692L28.8235 44.7567L19.098 48.2904ZM4.32585 53.6607L8.08603 43.3469L14.6529 49.9122L4.32585 53.6607ZM33.29 43.1348L14.8544 24.7037L18.346 15.0719L42.9027 39.6226L33.29 43.1348ZM34.3644 17.1852C34.4047 15.733 34.7564 14.3063 35.3957 13.0017C36.8192 10.1581 39.5051 8.59259 42.9591 8.59259C44.7586 8.59259 45.9135 7.97769 46.6253 6.65657C47.0001 5.91747 47.2151 5.1078 47.2565 4.28019C47.2586 3.71046 47.487 3.16492 47.8915 2.76357C48.0918 2.56485 48.3292 2.40751 48.5903 2.30053C48.8514 2.19355 49.131 2.13903 49.4132 2.14009C49.6954 2.14115 49.9746 2.19776 50.2348 2.30669C50.4951 2.41563 50.7314 2.57474 50.9302 2.77497C51.1289 2.97519 51.2863 3.21259 51.3933 3.47362C51.5003 3.73465 51.5549 4.0142 51.5538 4.2963C51.5538 7.74944 49.2655 12.8889 42.9591 12.8889C41.1596 12.8889 40.0047 13.5038 39.2929 14.8249C38.9181 15.564 38.7031 16.3737 38.6617 17.2013C38.6607 17.4834 38.6041 17.7625 38.4951 18.0227C38.3861 18.283 38.227 18.5192 38.0267 18.7179C37.8264 18.9166 37.589 19.074 37.3279 19.181C37.0668 19.2879 36.7872 19.3424 36.505 19.3414C36.2228 19.3403 35.9436 19.2837 35.6833 19.1748C35.4231 19.0659 35.1868 18.9067 34.988 18.7065C34.7892 18.5063 34.6319 18.2689 34.5249 18.0079C34.4179 17.7468 34.3633 17.4673 34.3644 17.1852ZM27.9183 8.59259V2.14815C27.9183 1.57842 28.1447 1.03203 28.5477 0.629178C28.9506 0.226322 29.4972 0 30.067 0C30.6369 0 31.1834 0.226322 31.5864 0.629178C31.9893 1.03203 32.2157 1.57842 32.2157 2.14815V8.59259C32.2157 9.16232 31.9893 9.70871 31.5864 10.1116C31.1834 10.5144 30.6369 10.7407 30.067 10.7407C29.4972 10.7407 28.9506 10.5144 28.5477 10.1116C28.1447 9.70871 27.9183 9.16232 27.9183 8.59259ZM55.2227 30.7024C55.6255 31.1055 55.8517 31.652 55.8514 32.2218C55.8512 32.7916 55.6245 33.338 55.2213 33.7407C54.8182 34.1434 54.2715 34.3695 53.7015 34.3693C53.1316 34.369 52.5851 34.1424 52.1823 33.7394L47.8849 29.4431C47.4818 29.04 47.2553 28.4933 47.2553 27.9232C47.2553 27.3532 47.4818 26.8065 47.8849 26.4034C48.2881 26.0003 48.8349 25.7739 49.4051 25.7739C49.9753 25.7739 50.5221 26.0003 50.9253 26.4034L55.2227 30.7024ZM56.5307 19.2232L50.0847 21.3714C49.544 21.5516 48.9539 21.5096 48.4441 21.2548C47.9344 21 47.5468 20.5532 47.3666 20.0127C47.1864 19.4722 47.2283 18.8822 47.4832 18.3726C47.738 17.863 48.1849 17.4755 48.7256 17.2953L55.1716 15.1471C55.7123 14.967 56.3024 15.0089 56.8122 15.2637C57.3219 15.5185 57.7095 15.9653 57.8897 16.5058C58.07 17.0464 58.028 17.6363 57.7731 18.1459C57.5183 18.6555 57.0714 19.0431 56.5307 19.2232Z"
				fill="black"
			/>
		</svg>
	);
}

/**
 * Left decorative colored card SVG
 */
function LeftColoredCard(props: ComponentProps<'svg'>) {
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

/**
 * Right decorative colored card SVG
 */
function RightColoredCard(props: ComponentProps<'svg'>) {
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
