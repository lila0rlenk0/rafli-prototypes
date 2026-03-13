import { describe, expect, mock, test } from 'bun:test';

import { ORDER_STATUS, type OrderWithRaffle } from '@/types/order';

import {
	mockAxiosError,
	mockAxiosResponse,
} from '../../../tests/helpers/mock-axios';

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet },
	baseClient: { get: mock() },
}));

const { getReusablePendingOrder } =
	await import('./get-reusable-pending-order');

function buildOrder(overrides: Partial<OrderWithRaffle> = {}): OrderWithRaffle {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		raffleId: '22222222-2222-4222-8222-222222222222',
		userId: 'user-1',
		ticketQuantity: 2,
		unitPrice: '10.00',
		totalAmount: '20.00',
		currency: 'USD',
		promoCode: null,
		status: ORDER_STATUS.PENDING,
		createdAt: '2026-03-13T12:00:00.000Z',
		updatedAt: '2026-03-13T12:00:00.000Z',
		raffleName: 'Test Raffle',
		raffleSlug: 'test-raffle',
		...overrides,
	};
}

describe('getReusablePendingOrder', () => {
	test('finds a reusable pending order even on page 4', async () => {
		mockGet.mockReset();
		mockGet
			.mockResolvedValueOnce(
				mockAxiosResponse({
					total: 301,
					orders: [
						buildOrder({
							id: '33333333-3333-4333-8333-333333333333',
							status: ORDER_STATUS.COMPLETED,
						}),
					],
				}),
			)
			.mockResolvedValueOnce(
				mockAxiosResponse({
					total: 301,
					orders: [
						buildOrder({
							id: '44444444-4444-4444-8444-444444444444',
							status: ORDER_STATUS.FAILED,
						}),
					],
				}),
			)
			.mockResolvedValueOnce(
				mockAxiosResponse({
					total: 301,
					orders: [
						buildOrder({
							id: '99999999-9999-4999-8999-999999999999',
							status: ORDER_STATUS.COMPLETED,
						}),
					],
				}),
			)
			.mockResolvedValueOnce(
				mockAxiosResponse({
					total: 301,
					orders: [buildOrder({ id: '88888888-8888-4888-8888-888888888888' })],
				}),
			);

		const result = await getReusablePendingOrder(
			'22222222-2222-4222-8222-222222222222',
			2,
		);

		expect(result).toEqual({
			kind: 'found',
			order: buildOrder({ id: '88888888-8888-4888-8888-888888888888' }),
		});
		expect(mockGet).toHaveBeenCalledTimes(4);
		expect(mockGet.mock.calls[0]?.[1]).toMatchObject({
			params: { page: 1, limit: 100 },
		});
		expect(mockGet.mock.calls[1]?.[1]).toMatchObject({
			params: { page: 2, limit: 100 },
		});
		expect(mockGet.mock.calls[2]?.[1]).toMatchObject({
			params: { page: 3, limit: 100 },
		});
		expect(mockGet.mock.calls[3]?.[1]).toMatchObject({
			params: { page: 4, limit: 100 },
		});
	});

	test('returns not_found only after exhausting every page', async () => {
		mockGet.mockReset();
		mockGet
			.mockResolvedValueOnce(
				mockAxiosResponse({
					total: 101,
					orders: [
						buildOrder({
							id: '55555555-5555-4555-8555-555555555555',
							status: ORDER_STATUS.COMPLETED,
						}),
					],
				}),
			)
			.mockResolvedValueOnce(
				mockAxiosResponse({
					total: 101,
					orders: [
						buildOrder({
							id: '66666666-6666-4666-8666-666666666666',
							status: ORDER_STATUS.FAILED,
						}),
					],
				}),
			);

		const result = await getReusablePendingOrder(
			'22222222-2222-4222-8222-222222222222',
			2,
		);

		expect(result).toEqual({ kind: 'not_found' });
		expect(mockGet).toHaveBeenCalledTimes(2);
	});

	test('skips pending orders with incompatible promo codes', async () => {
		mockGet.mockReset();
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				total: 1,
				orders: [
					buildOrder({
						id: 'aaa11111-1111-4111-8111-111111111111',
						promoCode: 'OTHER_CODE',
					}),
				],
			}),
		);

		const result = await getReusablePendingOrder(
			'22222222-2222-4222-8222-222222222222',
			2,
			'MY_CODE',
		);

		expect(result).toEqual({ kind: 'not_found' });
	});

	test('matches pending order when promo matches or order has no promo', async () => {
		mockGet.mockReset();
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				total: 1,
				orders: [
					buildOrder({
						id: 'bbb11111-1111-4111-8111-111111111111',
						promoCode: null,
					}),
				],
			}),
		);

		const result = await getReusablePendingOrder(
			'22222222-2222-4222-8222-222222222222',
			2,
			'MY_CODE',
		);

		expect(result).toEqual({
			kind: 'found',
			order: buildOrder({
				id: 'bbb11111-1111-4111-8111-111111111111',
				promoCode: null,
			}),
		});
	});

	test('rejects pending orders when no promo expected but order has one', async () => {
		mockGet.mockReset();
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				total: 1,
				orders: [
					buildOrder({
						id: 'ccc11111-1111-4111-8111-111111111111',
						promoCode: 'SOME_CODE',
					}),
				],
			}),
		);

		// No promoCode argument = only accept orders without promo
		const result = await getReusablePendingOrder(
			'22222222-2222-4222-8222-222222222222',
			2,
		);

		expect(result).toEqual({ kind: 'not_found' });
	});

	test('returns lookup_failed when any page read degrades', async () => {
		mockGet.mockReset();
		mockGet
			.mockResolvedValueOnce(
				mockAxiosResponse({
					total: 101,
					orders: [
						buildOrder({
							id: '77777777-7777-4777-8777-777777777777',
							status: ORDER_STATUS.COMPLETED,
						}),
					],
				}),
			)
			.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getReusablePendingOrder(
			'22222222-2222-4222-8222-222222222222',
			2,
		);

		expect(result).toEqual({
			kind: 'lookup_failed',
			error: 'network_error',
		});
	});
});
