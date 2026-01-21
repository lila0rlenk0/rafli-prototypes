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
				className="max-w-2xl border border-[#0F0F0FF2] py-16"
				showCloseButton={true}
			>
				<DialogHeader className="flex items-center justify-center space-y-4">
					<div className="flex justify-center pb-2">
						<QuestionMarkIcon />
					</div>
					<DialogTitle className="font-clash-display text-3xl font-semibold text-[#182135]">
						Quick check before you join
					</DialogTitle>
					<DialogDescription className="max-w-md text-center text-base text-black">
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
							className="space-y-3"
						>
							{getSortedOptions(question.options).map((option) => (
								<div
									key={option.id}
									className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
								>
									<RadioGroupItem
										value={option.id}
										id={option.id}
										className="size-4 border-gray-300"
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
								className="hover:bg-background w-full max-w-xs cursor-pointer border-2 border-black bg-black hover:text-black"
							>
								{isLoading && (
									<Loader2Icon className="mr-2 size-4 animate-spin" />
								)}
								<span className="font-semibold">Submit answer</span>
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
			width="110"
			height="110"
			viewBox="0 0 110 110"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<circle cx="55" cy="55" r="50" stroke="#182135" strokeWidth="4" />
			<path
				d="M55 77V77.5"
				stroke="#182135"
				strokeWidth="8"
				strokeLinecap="round"
			/>
			<path
				d="M55 65C55 55 67 53 67 42C67 34.268 60.732 28 53 28C45.268 28 39 34.268 39 42"
				stroke="#182135"
				strokeWidth="6"
				strokeLinecap="round"
			/>
		</svg>
	);
}
