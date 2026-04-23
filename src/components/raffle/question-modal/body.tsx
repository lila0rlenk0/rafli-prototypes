'use client';

import { Loader2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { RaffleQuestion } from '@/types/raffle-question';

interface QuestionBodyProps {
	question: RaffleQuestion | null;
	isFetching: boolean;
	isLoading: boolean;
	selectedOptionId: string;
	onSelectOption: (value: string) => void;
	onSubmit: () => void;
}

/**
 * Sorts question options by their `sortOrder` so the render order
 * matches the host's configured sequence. Stable sort semantics are
 * guaranteed by `.toSorted()`.
 */
function getSortedOptions(options: RaffleQuestion['options']) {
	return options.toSorted((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Interactive body of the quiz modal — renders a spinner while fetching,
 * nothing when the question hasn't loaded, and the radio group + submit
 * button otherwise. Stateless: parent owns `selectedOptionId` and fetch
 * lifecycle.
 */
export function QuestionBody({
	question,
	isFetching,
	isLoading,
	selectedOptionId,
	onSelectOption,
	onSubmit,
}: QuestionBodyProps) {
	if (isFetching) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2Icon className="size-8 animate-spin text-gray-400" />
			</div>
		);
	}
	if (!question) return null;
	return (
		<div className="mt-4 flex flex-col gap-6">
			<p className="text-center text-lg font-semibold">{question.text}</p>
			<RadioGroup
				value={selectedOptionId}
				onValueChange={onSelectOption}
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
					onClick={onSubmit}
					disabled={isLoading || !selectedOptionId}
					className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
				>
					{isLoading ? (
						<Loader2Icon className="mr-2 size-4 animate-spin" />
					) : null}
					<span className="font-semibold">Confirm</span>
				</Button>
			</div>
		</div>
	);
}
