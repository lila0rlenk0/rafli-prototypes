import { describe, expect, mock, spyOn, test } from 'bun:test';

import * as buildCheckout from './build-checkout-order';
import { proceedToStripeCheckout } from './proceed-to-stripe-checkout';

describe('proceedToStripeCheckout (module single-flight / dual hook mitigated)', () => {
	const setIsLoading = mock();
	const router = { refresh: mock() } as never;

	const opts = {
		raffleId: 'r1',
		publicSlug: 'slug',
		ticketQuantity: 1,
		promoCode: undefined as string | undefined,
		clearPromo: mock(),
		router,
		setIsLoading,
	};

	test('second concurrent start is a no-op while first awaits build', async () => {
		// `spyOn` only — do not `mock.module` the whole file; that replaces exports for the entire
		// runner and makes later integration tests import a stub (or a broken re-export chain).
		let release!: (v: null) => void;
		const held = new Promise<null>(res => {
			release = res;
		});
		const spy = spyOn(buildCheckout, 'buildCheckoutOrder').mockImplementation(
			() => held,
		);

		const p1 = proceedToStripeCheckout(opts);
		void proceedToStripeCheckout(opts);

		expect(spy).toHaveBeenCalledTimes(1);
		release(null);
		await p1;
		spy.mockRestore();
	});

	test('when setIsLoading(true) throws, module guard clears so a later call can build', async () => {
		let firstLoading = true;
		const fragileSetLoading = mock();
		fragileSetLoading.mockImplementation((loading: boolean) => {
			if (loading && firstLoading) {
				firstLoading = false;
				throw new Error('setLoading failed');
			}
		});

		const spy = spyOn(buildCheckout, 'buildCheckoutOrder').mockResolvedValue(
			null,
		);

		await proceedToStripeCheckout({ ...opts, setIsLoading: fragileSetLoading });
		expect(spy).toHaveBeenCalledTimes(0);

		await proceedToStripeCheckout({ ...opts, setIsLoading: fragileSetLoading });

		expect(spy).toHaveBeenCalledTimes(1);
		spy.mockRestore();
	});
});
