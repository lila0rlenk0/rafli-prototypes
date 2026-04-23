'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { QuestionBody } from '@/components/raffle/question-modal/body';
import {
	ColoredCards,
	QuestionMarkIcon,
} from '@/components/raffle/question-modal/decorations';
import { getQuestionErrorMessage } from '@/components/raffle/question-modal/error-messages';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { getRaffleQuestion } from '@/services/raffle/get-raffle-question';
import { submitRaffleAnswer } from '@/services/raffle/submit-raffle-answer';
import type { RaffleQuestion } from '@/types/raffle-question';

interface RaffleQuestionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	raffleId: string;
	onCorrectAnswer: () => void;
}

/**
 * Check-in question modal shown before joining a raffle with a quiz
 * gate. Owns fetch-on-open state + answer submission; the body layout
 * and decorative artwork live in sibling components to keep this shell
 * focused on orchestration.
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

	// useCallback: stable identity prevents fetchQuestion's effect (which
	// depends on handleOpenChange) from re-running per render.
	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				setSelectedOptionId('');
			}
			onOpenChange(nextOpen);
		},
		[onOpenChange],
	);

	// useCallback: stable reference prevents the mount effect from
	// re-fetching when unrelated state changes trigger re-renders.
	const fetchQuestion = useCallback(async () => {
		setIsFetching(true);

		try {
			const result = await getRaffleQuestion(raffleId);

			if (!result.success) {
				toast.error(getQuestionErrorMessage(result.error));
				handleOpenChange(false);
				return;
			}

			setQuestion(result.data);
		} catch (error) {
			console.error('Unexpected error fetching question:', error);
			toast.error('Failed to load question. Please try again.');
			handleOpenChange(false);
		} finally {
			setIsFetching(false);
		}
	}, [handleOpenChange, raffleId]);

	// mount: fetch question on first open; skip if already loaded.
	useEffect(() => {
		if (open && !question) {
			fetchQuestion();
		}
	}, [open, question, fetchQuestion]);

	async function handleSubmit() {
		if (!selectedOptionId) {
			toast.error('Please select an answer');
			return;
		}
		setIsLoading(true);
		try {
			const result = await submitRaffleAnswer(raffleId, selectedOptionId);

			if (!result.success) {
				toast.error(getQuestionErrorMessage(result.error));
				return;
			}

			if (result.data.correct) {
				onCorrectAnswer();
				handleOpenChange(false);
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

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className="border-ink-alpha max-w-3xl border bg-white px-6 py-8 sm:px-32 sm:py-24"
				showCloseButton={true}
			>
				<ColoredCards className="absolute right-0 bottom-0 -z-1 w-48 rounded-br-xl sm:w-auto" />

				<DialogHeader className="flex items-center justify-center gap-4">
					<div className="flex justify-center pb-2">
						<QuestionMarkIcon className="size-20 sm:size-27.5" />
					</div>
					<DialogTitle className="font-clash-display text-navy text-2xl font-semibold sm:text-3xl">
						Quick check before you join
					</DialogTitle>
					<DialogDescription className="max-w-md text-center text-sm text-black sm:text-base">
						The host added a short question for participants. Answer it to
						continue — it helps keep sweepstakes fair and real.
					</DialogDescription>
				</DialogHeader>

				<QuestionBody
					question={question}
					isFetching={isFetching}
					isLoading={isLoading}
					selectedOptionId={selectedOptionId}
					onSelectOption={setSelectedOptionId}
					onSubmit={handleSubmit}
				/>
			</DialogContent>
		</Dialog>
	);
}
