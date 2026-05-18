import type { z } from 'zod';

import type { raffleFormSchema } from '@/lib/validation/raffle/create-form-schema';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { ServiceFieldIssue } from '@/types/service-response';

type RaffleFormData = z.infer<typeof raffleFormSchema>;

interface RaffleServerError {
	message: string;
	field?: keyof RaffleFormData;
}

// Backend wire keys → form field names. The wire payload diverges from the
// form: dates split into date+time, IDs use the `-Id` suffix, monetary
// fields use `Amount`. Anything not in this table (e.g. `timezone`) has no
// corresponding form input and is dropped — the caller still surfaces the
// raw message via the aggregate toast.
const WIRE_PATH_TO_FIELD: Readonly<Record<string, keyof RaffleFormData>> = {
	title: 'title',
	description: 'description',
	declaredValueAmount: 'price',
	categoryId: 'category',
	questionId: 'checkInQuestion',
	startAt: 'startDate',
	endAt: 'endDate',
	ticketPriceAmount: 'pricePerTicket',
	numberOfWinners: 'numberOfWinners',
	minParticipants: 'minParticipants',
	maxParticipants: 'maxParticipants',
	acceptsCrypto: 'acceptsCrypto',
	cryptoChainIds: 'cryptoChainIds',
	cryptoTokens: 'cryptoTokens',
	cryptoTokenPricing: 'cryptoTokenPricing',
	minTickets: 'minTickets',
	maxTicketsPerUser: 'maxTicketsPerUser',
	winnerSelectionMode: 'winnerSelectionMode',
	enrollmentMode: 'enrollmentMode',
	xShareTicketsEnabled: 'xShareTicketsEnabled',
};

/**
 * Lookup table — raffle error code → user copy (and optional RHF
 * field to target). Field-targeted errors cause the provider to call
 * `form.setError(field)` and jump to the owning step.
 */
const SERVER_ERROR_LOOKUP: Partial<Record<RaffleErrorCode, RaffleServerError>> =
	{
		[RAFFLE_ERROR_CODES.MIN_PARTICIPANTS_MUST_EXCEED_WINNERS]: {
			message:
				'Minimum participants must be greater than the number of winners',
			field: 'minParticipants',
		},
		[RAFFLE_ERROR_CODES.INVALID_DATES]: {
			message: 'Invalid dates. End date must be after start date.',
			field: 'endDate',
		},
		[RAFFLE_ERROR_CODES.NOT_DRAFT]: {
			message: 'Sweepstakes is not in draft status and cannot be edited',
		},
		[RAFFLE_ERROR_CODES.PERMISSION_DENIED]: {
			message: 'You do not have permission to perform this action',
		},
		[RAFFLE_ERROR_CODES.MISSING_FIELDS]: {
			message: 'Some required fields are missing',
		},
	};

/**
 * Resolves the user-facing message + optional RHF field target for a
 * raffle creation error.
 *
 * @returns The message and the field to focus, if any.
 */
export function getRaffleServerError(code: RaffleErrorCode): RaffleServerError {
	return (
		SERVER_ERROR_LOOKUP[code] ?? { message: 'Failed to create sweepstakes' }
	);
}

/**
 * Translates backend `validationIssues` (Zod-style dotted paths +
 * messages) into a form-field-keyed map the create flow can drop into
 * `form.setError`. Dotted suffixes (`cryptoTokenPricing.0.price`) are
 * collapsed to their root field — RHF can highlight the whole array
 * even when the offending entry is nested.
 *
 * @param issues - Issues surfaced by `extractValidationIssues`
 * @returns Form-field → message map (empty when nothing maps cleanly)
 */
export function mapFieldIssuesToFormErrors(
	issues: readonly ServiceFieldIssue[],
): ReadonlyMap<keyof RaffleFormData, string> {
	const out = new Map<keyof RaffleFormData, string>();
	for (const issue of issues) {
		const root = issue.path.split('.')[0];
		const field = WIRE_PATH_TO_FIELD[root];
		if (field && !out.has(field)) {
			out.set(field, issue.message);
		}
	}
	return out;
}
