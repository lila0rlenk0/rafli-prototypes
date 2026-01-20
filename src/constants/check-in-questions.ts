/**
 * Check-in question definitions for participant verification
 */

export interface CheckInQuestion {
	id: string;
	value: string;
	label: string;
	options: readonly [string, string, string, string];
	correctAnswer: number; // index of the correct answer (0-3)
}

export const CHECK_IN_QUESTIONS = [
	{
		id: '019ba0f7-020c-7000-8071-1e7aa7e6ad91',
		value: 'capital-usa',
		label: 'What is the capital of the United States?',
		options: [
			'New York',
			'Washington D.C.',
			'Los Angeles',
			'Chicago',
		] as const,
		correctAnswer: 1,
	},
	{
		id: '019ba0f7-4282-7000-a420-10b30004144e',
		value: 'largest-ocean',
		label: 'What is the largest ocean in the world?',
		options: [
			'Atlantic',
			'Pacific',
			'Indian',
			'Arctic',
		] as const,
		correctAnswer: 1,
	},
	{
		id: '019ba0f7-58c7-7000-9522-f4241d527bf3',
		value: 'primary-colors',
		label: 'What are the three primary colors?',
		options: [
			'Red, Blue, Yellow',
			'Green, Orange, Purple',
			'Black, White, Gray',
			'Pink, Turquoise, Brown',
		] as const,
		correctAnswer: 0,
	},
	{
		id: '019ba0f7-7461-7000-b4ce-a6a0f35f1865',
		value: 'planets-solar-system',
		label: 'How many planets are in the solar system?',
		options: ['7', '8', '9', '10'] as const,
		correctAnswer: 1,
	},
	{
		id: '019ba0f7-9a2b-7000-c3d4-e5f6a7b8c9d0',
		value: 'largest-continent',
		label: 'What is the largest continent in the world?',
		options: [
			'Africa',
			'Asia',
			'North America',
			'Europe',
		] as const,
		correctAnswer: 1,
	},
] as const;

export type CheckInQuestionValue =
	(typeof CHECK_IN_QUESTIONS)[number]['value'];

/**
 * Gets the UUID for a check-in question value/slug
 */
export function getCheckInQuestionId(
	value: string,
): string | undefined {
	const question = CHECK_IN_QUESTIONS.find(q => q.value === value);
	return question?.id;
}

/**
 * Gets the value/slug for a check-in question ID
 */
export function getCheckInQuestionValue(
	id: string,
): string | undefined {
	const question = CHECK_IN_QUESTIONS.find(q => q.id === id);
	return question?.value;
}

/**
 * Gets the human-readable label for a check-in question ID
 */
export function getCheckInQuestionLabel(id: string): string {
	const question = CHECK_IN_QUESTIONS.find(q => q.id === id);
	return question ? question.label : 'Unknown question';
}

/**
 * Gets the full question object by ID
 */
export function getCheckInQuestionById(
	id: string,
): CheckInQuestion | undefined {
	return CHECK_IN_QUESTIONS.find(q => q.id === id);
}

/**
 * Gets the full question object by value
 */
export function getCheckInQuestionByValue(
	value: string,
): CheckInQuestion | undefined {
	return CHECK_IN_QUESTIONS.find(q => q.value === value);
}
