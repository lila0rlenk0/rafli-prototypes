import { describe, expect, test } from 'bun:test';

import { buildFanbasisCheckoutConfig } from './fanbasis-checkout-config';

describe('buildFanbasisCheckoutConfig', () => {
	test('passes the four required Fanbasis SDK fields from the backend session', () => {
		const config = buildFanbasisCheckoutConfig({
			checkoutSessionSecret: 'sec_public_credit',
			creatorId: 'mode-mobile',
			environment: 'sandbox',
			productId: 'ZVABE',
		});

		expect(config.creatorId).toBe('mode-mobile');
		expect(config.productId).toBe('ZVABE');
		expect(config.checkoutSessionSecret).toBe('sec_public_credit');
		expect(config.environment).toBe('sandbox');
	});

	test('keeps optional checkout extensions out of the anonymous fixed-price flow', () => {
		const config = buildFanbasisCheckoutConfig({
			checkoutSessionSecret: 'sec_public_credit',
			creatorId: 'mode-mobile',
			environment: 'production',
			productId: 'ZVABE',
		});

		// The iframe collects buyer PII itself. Adding prefill/field locks
		// without trusted local user data would either leak assumptions into
		// checkout or violate Fanbasis' "hide implies prefill" rule.
		expect('prefill' in config).toBe(false);
		expect('fields' in config).toBe(false);
		expect('collectPhone' in config).toBe(false);
		expect('metadata' in config).toBe(false);
		expect('redirectSettings' in config).toBe(false);
	});

	test('includes stable iframe presentation options alongside the required fields', () => {
		const config = buildFanbasisCheckoutConfig({
			checkoutSessionSecret: 'sec_public_credit',
			creatorId: 'mode-mobile',
			environment: 'sandbox',
			productId: 'ZVABE',
		});

		expect(config.theme).toMatchObject({
			theme: 'light',
			show_coupon_row: false,
			product_layout: 'above',
		});
		expect(config.containerOptions).toEqual({
			width: '100%',
			height: '420px',
		});
	});
});
