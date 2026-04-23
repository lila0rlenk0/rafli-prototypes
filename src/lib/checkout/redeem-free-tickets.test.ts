import type { ReadonlyURLSearchParams } from 'next/navigation';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from 'bun:test';

import * as redeemPromo from '@/services/promo-code/redeem-promo-code';

import { redeemFreeTickets } from './redeem-free-tickets';

describe('redeemFreeTickets (single-flight / race on free promo mitigated)', () => {
	const prevWindow = globalThis.window;
	beforeEach(() => {
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: { history: { replaceState: mock() } },
		});
	});
	afterEach(() => {
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: prevWindow,
		});
	});

	const router = { refresh: mock() };
	const setIsLoading = mock();
	const base = {
		raffleId: 'r1',
		promoCode: 'FREE',
		pathname: '/browse/x',
		searchParams: { toString: () => 'code=FREE' } as ReadonlyURLSearchParams,
		router: router as never,
		clearPromo: mock(),
		setIsLoading,
	};

	test('overlapping calls only invoke redeem once while first is in flight', async () => {
		// Hold the first call until we resolve — then await it so `finally` clears the module guard
		// (otherwise later tests see `freeTicketRedeemInFlight === true` forever).
		let release!: (
			v: Awaited<ReturnType<typeof redeemPromo.redeemPromoCode>>,
		) => void;
		const held = new Promise<
			Awaited<ReturnType<typeof redeemPromo.redeemPromoCode>>
		>(res => {
			release = res;
		});
		const spy = spyOn(redeemPromo, 'redeemPromoCode').mockImplementation(
			() => held,
		);

		const p1 = redeemFreeTickets(base);
		void redeemFreeTickets(base);

		expect(spy).toHaveBeenCalledTimes(1);
		release({
			success: true,
			data: {
				redemptionId: 'rid',
				type: 'free_tickets',
				ticketsGranted: 1,
			},
		});
		await p1;
		spy.mockRestore();
	});

	test('when setIsLoading(true) throws, module guard still clears so a later call can redeem', async () => {
		let firstLoading = true;
		const fragileSetLoading = mock();
		fragileSetLoading.mockImplementation((loading: boolean) => {
			if (loading && firstLoading) {
				firstLoading = false;
				throw new Error('setLoading failed');
			}
		});

		const spy = spyOn(redeemPromo, 'redeemPromoCode').mockResolvedValue({
			success: true,
			data: {
				redemptionId: 'rid',
				type: 'free_tickets',
				ticketsGranted: 1,
			},
		} as Awaited<ReturnType<typeof redeemPromo.redeemPromoCode>>);

		// `setIsLoading` throw is caught by the action’s catch — promise resolves; `finally` clears guard
		await redeemFreeTickets({ ...base, setIsLoading: fragileSetLoading });
		expect(spy).toHaveBeenCalledTimes(0);

		await redeemFreeTickets({ ...base, setIsLoading: fragileSetLoading });

		expect(spy).toHaveBeenCalledTimes(1);
		spy.mockRestore();
	});
});
