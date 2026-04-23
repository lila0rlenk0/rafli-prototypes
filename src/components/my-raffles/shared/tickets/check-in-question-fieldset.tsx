'use client';

import type { Path, PathValue } from 'react-hook-form';

import { Combobox } from '@/components/ui/combobox';
import type { Question } from '@/types/question';

import type {
	TicketsFormValues,
	TicketsStepErrors,
	TicketsStepForm,
	TicketsStepTouched,
} from './types';

interface CheckInQuestionFieldsetProps<TValues extends TicketsFormValues> {
	form: TicketsStepForm<TValues>;
	questions: readonly Question[];
	selectedQuestion: Question | null;
	/** Card padding — create uses `p-8`, edit uses `p-6`. */
	cardPadding: 'p-6' | 'p-8';
}

const CHECK_IN_QUESTION = 'checkInQuestion';

/**
 * Check-in question selector + selected-question options preview. Drives
 * the `checkInQuestion` field on the wizard form and renders the ordered
 * option list underneath once a question is chosen.
 *
 * @returns Check-in question fieldset JSX.
 */
export function CheckInQuestionFieldset<TValues extends TicketsFormValues>({
	form,
	questions,
	selectedQuestion,
	cardPadding,
}: CheckInQuestionFieldsetProps<TValues>) {
	const { watch, setValue, formState } = form;
	// Flatten recursive RHF types to a field-name lookup once per render.
	const errors = formState.errors as TicketsStepErrors;
	const touchedFields = formState.touchedFields as TicketsStepTouched;

	const fieldPath = CHECK_IN_QUESTION as Path<TValues>;
	const checkInQuestion = (watch(fieldPath) as string | undefined) ?? '';
	const touched = Boolean(touchedFields[CHECK_IN_QUESTION]);
	const errorMessage = errors[CHECK_IN_QUESTION]?.message ?? null;

	// Map once per render — questions list is stable across typing because
	// it's loaded at provider mount time.
	const options = questions.map(q => ({ value: q.id, label: q.text }));

	function handleValueChange(value: string) {
		setValue(fieldPath, value as PathValue<TValues, Path<TValues>>, {
			shouldValidate: true,
		});
	}

	return (
		<div className={`flex flex-col gap-6 rounded-2xl bg-white ${cardPadding}`}>
			<div className="flex flex-col gap-2">
				<h2 className="text-xl font-semibold">Participant Check-in Question</h2>
				<p className="text-muted-foreground text-sm">
					Choose a simple question participants will answer before joining your
					sweepstakes. This helps confirm real participation and keeps entries
					fair.
				</p>
			</div>

			<div className="flex flex-col gap-2">
				<label htmlFor="checkInQuestion" className="font-medium">
					Question
				</label>
				<Combobox
					options={options}
					value={checkInQuestion}
					onValueChange={handleValueChange}
					placeholder="Select question"
					searchPlaceholder="Search question..."
					emptyText="No question found."
					className="max-w-md"
				/>
				{touched && errorMessage ? (
					<span className="text-sm text-red-500">{errorMessage}</span>
				) : null}
			</div>

			{selectedQuestion ? (
				<SelectedQuestionOptions question={selectedQuestion} />
			) : null}
		</div>
	);
}

interface SelectedQuestionOptionsProps {
	question: Question;
}

/**
 * Renders the selected question's answer options, sorted by `sortOrder`.
 * Extracted so the host can preview the choices participants will see.
 */
function SelectedQuestionOptions({ question }: SelectedQuestionOptionsProps) {
	// `.toSorted` returns a new array — avoids mutating the shared `options`
	// reference on re-renders while still honouring the backend's sort hint.
	const sortedOptions = question.options.toSorted(
		(a, b) => a.sortOrder - b.sortOrder,
	);
	return (
		<div className="flex flex-col gap-2">
			{sortedOptions.map(option => (
				<div key={option.id}>
					<span className="text-muted-foreground text-sm">{option.text}</span>
				</div>
			))}
		</div>
	);
}
