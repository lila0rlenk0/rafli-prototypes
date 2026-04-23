import type { EditFormData } from '@/lib/validation/raffle/edit-form-schema';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';

interface EditRaffleServerError {
	message: string;
	field?: keyof EditFormData;
}

/**
 * Lookup table — raffle error code → user copy (and optional RHF field
 * to target). Field-targeted errors cause the provider to call
 * `form.setError(field)` and jump to the owning step. Mirrors the
 * create-wizard counterpart so both flows surface identical copy for
 * overlapping error codes.
 */
const SERVER_ERROR_LOOKUP: Partial<
	Record<RaffleErrorCode, EditRaffleServerError>
> = {
	[RAFFLE_ERROR_CODES.MIN_PARTICIPANTS_MUST_EXCEED_WINNERS]: {
		message: 'Minimum participants must be greater than the number of winners',
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
 * raffle update error.
 *
 * @returns The message and the field to focus, if any.
 */
export function getEditRaffleServerError(
	code: RaffleErrorCode,
): EditRaffleServerError {
	return (
		SERVER_ERROR_LOOKUP[code] ?? { message: 'Failed to update sweepstakes' }
	);
}
