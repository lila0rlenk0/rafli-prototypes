'use client';

import { Loader2Icon } from 'lucide-react';
import { ComponentProps, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getRaffleQuestion } from '@/services/raffle/get-raffle-question';
import { submitRaffleAnswer } from '@/services/raffle/submit-raffle-answer';
import type { RaffleErrorCode } from '@/types/errors';
import type { RaffleQuestion } from '@/types/raffle-question';

interface RaffleQuestionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	raffleId: string;
	onCorrectAnswer: () => void;
}

/**
 * RaffleQuestionModal Component
 *
 * Displays a question modal that users must answer correctly before purchasing tickets.
 * Fetches the question on mount and handles answer submission.
 */
export function RaffleQuestionModal({
	open,
	onOpenChange,
	raffleId,
	onCorrectAnswer,
}: RaffleQuestionModalProps) {
	const [question, setQuestion] = useState<RaffleQuestion | null>(null);
	const [selectedOptionId, setSelectedOptionId] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(false);

	/**
	 * Gets user-friendly error message for error codes
	 * @param errorCode - The error code
	 * @returns User-friendly error message
	 */
	function getErrorMessage(errorCode: RaffleErrorCode): string {
		switch (errorCode) {
			case 'core:raffle:question-not-found':
				return 'Question not found for this raffle';
			case 'core:option:not-found':
				return 'Selected option not found';
			case 'core:option:invalid':
				return 'Invalid option selected';
			case 'network_error':
				return 'Network error. Please check your connection';
			case 'timeout_error':
				return 'Request timed out. Please try again';
			case 'global:auth:unauthenticated':
			case 'unauthorized':
				return 'Please sign in to continue';
			case 'global:ratelimit:exceeded':
				return 'Too many attempts. Please wait a moment';
			default:
				return 'An error occurred. Please try again';
		}
	}

	/**
	 * Fetches the question from the API
	 */
	const fetchQuestion = useCallback(async () => {
		setIsFetching(true);

		try {
			const result = await getRaffleQuestion(raffleId);

			if (!result.success) {
				const message = getErrorMessage(result.error);
				toast.error(message);
				onOpenChange(false);
				return;
			}

			setQuestion(result.data);
		} catch (error) {
			console.error('Unexpected error fetching question:', error);
			toast.error('Failed to load question. Please try again.');
			onOpenChange(false);
		} finally {
			setIsFetching(false);
		}
	}, [raffleId, onOpenChange]);

	/**
	 * Fetches the raffle question when modal opens
	 */
	useEffect(() => {
		if (open && !question) {
			fetchQuestion();
		}
	}, [open, question, fetchQuestion]);

	/**
	 * Resets state when modal closes
	 */
	useEffect(() => {
		if (!open) {
			setSelectedOptionId('');
		}
	}, [open]);

	/**
	 * Handles the answer submission
	 */
	async function handleSubmit() {
		if (!selectedOptionId) {
			toast.error('Please select an answer');
			return;
		}

		setIsLoading(true);

		try {
			const result = await submitRaffleAnswer(raffleId, selectedOptionId);

			if (!result.success) {
				const message = getErrorMessage(result.error);
				toast.error(message);
				return;
			}

			if (result.data.correct) {
				onCorrectAnswer();
				onOpenChange(false);
			} else {
				toast.error('Incorrect answer. Please try again.');
				setSelectedOptionId('');
			}
		} catch (error) {
			console.error('Unexpected error submitting answer:', error);
			toast.error('An unexpected error occurred. Please try again');
		} finally {
			setIsLoading(false);
		}
	}

	/**
	 * Sorts options by their sortOrder field
	 * @param options - Array of question options
	 * @returns Sorted options array
	 */
	function getSortedOptions(options: RaffleQuestion['options']) {
		return [...options].sort((a, b) => a.sortOrder - b.sortOrder);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-3xl border border-[#0F0F0FF2] bg-white px-6 py-8 sm:px-32 sm:py-24"
				showCloseButton={true}
			>
				<ColoredCards className="absolute right-0 bottom-0 -z-1 w-48 rounded-br-xl sm:w-auto" />

				<DialogHeader className="flex items-center justify-center gap-4">
					<div className="flex justify-center pb-2">
						<QuestionMarkIcon className="size-20 sm:size-[110px]" />
					</div>
					<DialogTitle className="font-clash-display text-2xl font-semibold text-[#182135] sm:text-3xl">
						Quick check before you join
					</DialogTitle>
					<DialogDescription className="max-w-md text-center text-sm text-black sm:text-base">
						The host added a short question for participants. Answer it to
						continue — it helps keep raffles fair and real.
					</DialogDescription>
				</DialogHeader>

				{isFetching ? (
					<div className="flex items-center justify-center py-8">
						<Loader2Icon className="size-8 animate-spin text-gray-400" />
					</div>
				) : question ? (
					<div className="mt-4 space-y-6">
						<p className="text-center text-lg font-semibold">{question.text}</p>

						<RadioGroup
							value={selectedOptionId}
							onValueChange={setSelectedOptionId}
							className="mx-auto w-full max-w-md"
						>
							{getSortedOptions(question.options).map(option => (
								<div key={option.id} className="flex items-center gap-3">
									<RadioGroupItem
										value={option.id}
										id={option.id}
										className="size-4 shrink-0 border-gray-300"
									/>
									<Label
										htmlFor={option.id}
										className="flex-1 cursor-pointer text-base font-normal"
									>
										{option.text}
									</Label>
								</div>
							))}
						</RadioGroup>

						<div className="flex justify-center pt-4">
							<Button
								onClick={handleSubmit}
								disabled={isLoading || !selectedOptionId}
								className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
							>
								{isLoading && (
									<Loader2Icon className="mr-2 size-4 animate-spin" />
								)}
								<span className="font-semibold">Confirm</span>
							</Button>
						</div>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

/**
 * Question mark icon SVG component
 */
function QuestionMarkIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			viewBox="0 0 110 110"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M96.2267 54.9998C96.2267 52.6923 95.6473 50.4218 94.5393 48.3978C93.4308 46.3733 91.8289 44.6595 89.8844 43.4161C88.2598 42.3771 87.4613 40.4322 87.8836 38.5508C88.3922 36.289 88.3183 33.9338 87.6733 31.7071C87.0279 29.4806 85.8299 27.4518 84.191 25.8123C82.5514 24.1728 80.5232 22.9712 78.2962 22.3256C76.0693 21.6801 73.7147 21.6113 71.4526 22.1197C69.5705 22.5429 67.6219 21.7397 66.5828 20.1145C65.3396 18.1706 63.6294 16.5678 61.6056 15.4596C59.581 14.3511 57.3072 13.7721 54.9991 13.7721C52.6919 13.7723 50.421 14.3517 48.3971 15.4596C46.3727 16.568 44.6588 18.1701 43.4154 20.1145C42.3768 21.7389 40.4315 22.5415 38.5501 22.1197C36.2917 21.6135 33.943 21.6864 31.7199 22.3301C29.4962 22.9741 27.4683 24.1681 25.8296 25.8034C24.1915 27.4385 22.9914 29.4629 22.3429 31.6847C21.6948 33.9063 21.6176 36.2558 22.1191 38.515C22.5378 40.4014 21.7288 42.3469 20.0959 43.3803C18.137 44.62 16.5236 46.3358 15.4052 48.3665C14.2868 50.3977 13.6999 52.6809 13.6999 54.9998C13.6999 57.3187 14.2867 59.6016 15.4052 61.6331C16.5235 63.6638 18.137 65.3794 20.0959 66.6192C21.7287 67.6525 22.5377 69.5982 22.1191 71.4845C21.6173 73.7446 21.6942 76.0969 22.3429 78.3193C22.9914 80.5405 24.1919 82.5614 25.8296 84.1961C27.4683 85.8314 29.4962 87.0299 31.7199 87.6739C33.9425 88.3173 36.2922 88.3902 38.5501 87.8843L39.2573 87.7813C40.9076 87.6737 42.5121 88.4676 43.4199 89.894C44.6617 91.846 46.3781 93.4533 48.4061 94.5668C50.4335 95.6798 52.7086 96.2629 55.0215 96.2632C57.335 96.2632 59.6134 95.6803 61.6414 94.5668C63.6689 93.4534 65.3815 91.8456 66.6231 89.894C67.6579 88.2671 69.6016 87.4624 71.4839 87.8798C73.744 88.3815 76.0963 88.3047 78.3186 87.656C80.5406 87.0073 82.5649 85.8078 84.2 84.1693C85.8344 82.531 87.0293 80.5062 87.6733 78.2834C88.3172 76.0599 88.39 73.7076 87.8836 71.4487C87.4618 69.5674 88.26 67.622 89.8844 66.5834C91.8289 65.34 93.4308 63.6262 94.5393 61.6017C95.6471 59.5777 96.2267 57.3071 96.2267 54.9998ZM105.393 54.9998C105.393 58.8466 104.426 62.6318 102.578 66.006C101.224 68.4788 99.4252 70.6669 97.2875 72.4782C97.5304 75.2804 97.2645 78.1117 96.4774 80.8302C95.404 84.5364 93.411 87.9147 90.6855 90.6459C87.9607 93.3761 84.5905 95.3746 80.8878 96.4556C78.171 97.2486 75.3384 97.5205 72.5357 97.2837C70.7236 99.4324 68.5293 101.24 66.0501 102.601C62.6705 104.456 58.8769 105.43 55.0215 105.43C51.1661 105.43 47.3724 104.457 43.9928 102.601C41.5154 101.241 39.323 99.4351 37.5117 97.2882C34.7125 97.5296 31.8842 97.2644 29.1686 96.478C25.4627 95.4047 22.0885 93.4114 19.3574 90.6862C16.6266 87.9611 14.6244 84.5917 13.5432 80.8884C12.7507 78.1733 12.4746 75.3418 12.7107 72.5408C10.5551 70.7295 8.74185 68.5326 7.37541 66.0508C5.51185 62.6654 4.5332 58.8641 4.5332 54.9998C4.53328 51.1353 5.51167 47.3341 7.37541 43.9487C8.7424 41.4659 10.5539 39.2659 12.7107 37.4542C12.4755 34.6555 12.7516 31.8284 13.5432 29.1156C14.6243 25.4116 16.6262 22.0388 19.3574 19.3133C22.0885 16.5883 25.4629 14.5947 29.1686 13.5215C31.8868 12.7343 34.7187 12.4642 37.5207 12.7069C39.3314 10.5705 41.5213 8.77421 43.9928 7.42082C47.3668 5.57346 51.1525 4.60562 54.9991 4.60547C58.8457 4.60547 62.6314 5.57357 66.0054 7.42082C68.4769 8.77407 70.6668 10.5707 72.4775 12.7069C75.2855 12.4621 78.1235 12.7319 80.8475 13.5215C84.5593 14.5974 87.9394 16.5942 90.6721 19.3267C93.4046 22.0592 95.4013 25.4399 96.4774 29.1514C97.2669 31.8751 97.5322 34.7137 97.2875 37.5213C99.4252 39.3326 101.224 41.5208 102.578 43.9935C104.425 47.3675 105.393 51.153 105.393 54.9998Z"
				fill="black"
			/>
			<path
				d="M45.3463 30.0082C49.0783 27.8152 53.4647 27.012 57.7311 27.7434C61.9978 28.4753 65.8687 30.6938 68.6568 34.0052C71.444 37.3162 72.9724 41.5072 72.9671 45.8351L72.9089 47.1196C72.3244 53.4199 67.5336 57.6394 64.0511 59.961C62.0553 61.2915 60.0907 62.2677 58.6442 62.9107C57.9143 63.2351 57.2967 63.4805 56.8538 63.6492C56.6325 63.7335 56.4519 63.7996 56.3212 63.8461C56.2564 63.8692 56.2046 63.8905 56.1646 63.9043C56.145 63.911 56.1287 63.9177 56.1153 63.9222C56.1093 63.9243 56.1021 63.9251 56.0974 63.9267L56.0885 63.9312H56.084C53.6826 64.7316 51.0837 63.4322 50.2832 61.0308C49.4852 58.6328 50.7793 56.0379 53.1746 55.2345V55.2389L53.1836 55.2345C53.1957 55.2303 53.2185 55.2235 53.2507 55.2121C53.3209 55.1871 53.4377 55.1451 53.5909 55.0868C53.8999 54.9691 54.3613 54.7847 54.9202 54.5362C56.0514 54.0335 57.5258 53.2945 58.9665 52.3341C62.1262 50.2276 63.7995 47.9847 63.8005 45.8351V45.8261C63.8036 43.6616 63.0414 41.5649 61.6475 39.9089C60.2534 38.2528 58.3161 37.1418 56.1825 36.7758C54.0491 36.4101 51.8538 36.8115 49.9878 37.9082C48.122 39.0048 46.7049 40.7277 45.9863 42.7691C45.1463 45.1569 42.5287 46.4154 40.1408 45.5755C37.7533 44.7355 36.4995 42.1175 37.3389 39.7299C38.7756 35.6457 41.6136 32.202 45.3463 30.0082Z"
				fill="black"
			/>
			<path
				d="M55.0451 73.3335C57.5764 73.3335 59.6284 75.3855 59.6284 77.9168C59.6284 80.4481 57.5764 82.5002 55.0451 82.5002H55.0003C52.469 82.5002 50.417 80.4481 50.417 77.9168C50.417 75.3855 52.469 73.3335 55.0003 73.3335H55.0451Z"
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
