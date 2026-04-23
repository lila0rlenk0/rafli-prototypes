'use client';

import { useMemo } from 'react';

import type { Question } from '@/types/question';

import {
	checkIfStartDateIsToday,
	getTodayDate,
	isDateRangeValid as computeIsDateRangeValid,
	isEndDateWithin6Months as computeIsEndDateWithin6Months,
} from './ticket-dates';

/** Inputs read from the wizard form that drive the Tickets step's derived UI state. */
interface TicketsStepDerivedInput {
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	checkInQuestion: string;
	questions: readonly Question[];
}

/** Memoized derived values consumed by the step's JSX. */
interface TicketsStepDerived {
	todayDate: Date;
	isStartDateToday: boolean;
	isDateRangeValid: boolean;
	isEndDateWithin6Months: boolean;
	selectedQuestion: Question | null;
}

/**
 * Wraps the three derived memos the Tickets step relies on: the start/end
 * range validators (shared rules mirrored in the schema) and the selected
 * check-in question lookup. Keeping the memos here decouples the composer
 * JSX from the branching date arithmetic and keeps the composer below the
 * ESLint complexity cap.
 *
 * The hook is `.ts` (not `.tsx`) — no JSX, only `useMemo`.
 *
 * @returns Derived state for rendering the Tickets step.
 */
export function useTicketsStepDerived({
	startDate,
	startTime,
	endDate,
	endTime,
	checkInQuestion,
	questions,
}: TicketsStepDerivedInput): TicketsStepDerived {
	// useMemo: `getTodayDate()` is cheap but we want a stable reference across
	// renders so DatePicker's `minDate` prop doesn't thrash identity checks.
	const todayDate = useMemo(() => getTodayDate(), []);

	// `checkIfStartDateIsToday` is pure; the result only changes when the
	// backing date string changes so we don't need a memo around it.
	const isStartDateToday = checkIfStartDateIsToday(startDate);

	// useMemo: avoids rebuilding two Date objects on every keystroke in
	// unrelated fields. Derived from the four watched date/time inputs.
	const isDateRangeValid = useMemo(
		() =>
			computeIsDateRangeValid(
				{ date: startDate, time: startTime },
				{ date: endDate, time: endTime },
			),
		[startDate, startTime, endDate, endTime],
	);

	// useMemo: same rationale as above — the 6-month ceiling is derived from
	// the same four inputs and has non-trivial Date arithmetic.
	const isEndDateWithin6Months = useMemo(
		() =>
			computeIsEndDateWithin6Months(
				{ date: startDate, time: startTime },
				{ date: endDate, time: endTime },
			),
		[startDate, startTime, endDate, endTime],
	);

	// useMemo: O(n) array scan over questions — rescans only when selection
	// or the list itself change, not on every keystroke elsewhere in the form.
	const selectedQuestion = useMemo(() => {
		if (!checkInQuestion) return null;
		return questions.find(q => q.id === checkInQuestion) ?? null;
	}, [checkInQuestion, questions]);

	return {
		todayDate,
		isStartDateToday,
		isDateRangeValid,
		isEndDateWithin6Months,
		selectedQuestion,
	};
}
