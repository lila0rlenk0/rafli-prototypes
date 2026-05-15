import { describe, expect, test } from 'bun:test';

import { interpretClaimResult } from './use-claim-free-tickets';
import type { BuildCheckoutOrderResult } from '@/lib/checkout/build-checkout-order';

// Fixture: minimal Order shape — `interpretClaimResult` only branches on
// `isFullyDiscounted`, so the surrounding order payload is opaque to the
// helper. Reused across cases to keep the matrix focused on the only
// dimension that drives the decision.
const ORDER_STUB = { id: 'order-1' } as BuildCheckoutOrderResult['order'];

describe('interpretClaimResult', () => {
	describe('null result — buildCheckoutOrder already toasted the failure', () => {
		test('returns an aborted decision so the caller stays silent', () => {
			// `buildCheckoutOrder` returns null only after surfacing its own
			// toast (promo error, order error). Re-toasting in the hook would
			// double-fire the same message to the user.
			expect(interpretClaimResult(null)).toEqual({ kind: 'aborted' });
		});
	});

	describe('settled — backend auto-completed the $0 order', () => {
		test('returns settled with the order id so the caller can chain confirmation + refresh', () => {
			const result: BuildCheckoutOrderResult = {
				order: ORDER_STUB,
				isFullyDiscounted: true,
			};
			// `settled` carries the order id so the caller can pass it to
			// analytics / log breadcrumbs without re-reading the result.
			expect(interpretClaimResult(result)).toEqual({
				kind: 'settled',
				orderId: 'order-1',
			});
		});
	});

	describe('orphan pending — backend created a non-zero order despite the free-tickets path', () => {
		test('returns orphan-pending so the caller can abandon + clear promo + toast', () => {
			// Happens when promo state drifted (e.g. user manually bumped
			// quantity above the granted count after applying the free-tickets
			// promo). Silently returning here leaves a paid-pending order on
			// the backend with no user feedback — the orphan branch must be
			// observable so the caller can run the cleanup trio: abandon the
			// order, clear the broken promo, and toast the user.
			const result: BuildCheckoutOrderResult = {
				order: ORDER_STUB,
				isFullyDiscounted: false,
			};
			expect(interpretClaimResult(result)).toEqual({
				kind: 'orphan-pending',
				orderId: 'order-1',
			});
		});
	});
});
