import { describe, expect, test } from 'bun:test';

import { deriveFanbasisSdkErrorCode } from './fanbasis-error-code';

describe('deriveFanbasisSdkErrorCode', () => {
	test('maps PaymentError-like code fields', () => {
		expect(
			deriveFanbasisSdkErrorCode({
				code: 'CHECKOUT_SESSION_SECRET_REQUIRED',
			}),
		).toBe('payments:fanbasis-sdk:checkout-session-secret-required');
	});

	test('maps flat iframe errorCode payloads', () => {
		expect(
			deriveFanbasisSdkErrorCode({
				errorCode: 'CARD_DECLINED',
			}),
		).toBe('payments:fanbasis-sdk:card-declined');
	});

	test('maps nested form submission errorCode payloads', () => {
		expect(
			deriveFanbasisSdkErrorCode({
				data: {
					errorCode: 'FORM_SUBMISSION_ERROR',
				},
			}),
		).toBe('payments:fanbasis-sdk:form-submission-error');
	});

	test('falls back for unknown shapes', () => {
		expect(deriveFanbasisSdkErrorCode(new Error('boom'))).toBe('unknown_error');
	});
});
