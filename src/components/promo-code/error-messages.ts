/** Lookup — backend promo validation error → user-facing toast copy. */
const MESSAGES: Record<string, string> = {
	'core:promo:not-found': 'Invalid promo code',
	'core:promo:expired': 'This code has expired',
	'core:promo:max-uses-reached': 'This code has reached its usage limit',
	'core:promo:deactivated': 'This code is no longer active',
	'core:promo:already-redeemed': 'You have already used this code',
	'core:promo:host-cannot-redeem':
		'You cannot use codes on your own sweepstakes',
	'core:promo:question-required': 'Please answer the question first',
	'core:promo:raffle-mismatch': 'This code is for a different sweepstakes',
	'core:raffle:not-found': 'Sweepstakes not found',
	'core:raffle:not-live': 'This sweepstakes is not currently active',
	invalid_code: 'Invalid promo code format',
	'global:auth:unauthenticated': 'Sign in to apply promo codes',
	unauthorized: 'Sign in to apply promo codes',
	network_error: 'Network error. Please check your connection.',
	timeout_error: 'Request timed out. Please try again.',
};

/**
 * Maps backend `core:promo:*` error codes to user-facing messages for
 * the promo-code-input component.
 *
 * @returns A readable message, falling back to a generic retry prompt.
 */
export function getPromoInputErrorMessage(errorCode: string): string {
	return MESSAGES[errorCode] ?? 'Could not validate code';
}
