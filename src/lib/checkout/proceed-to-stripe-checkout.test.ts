import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from 'bun:test';
import { toast } from 'sonner';

import { ORDER_STATUS, type Order } from '@/types/order';

import * as buildCheckout from './build-checkout-order';
import * as checkoutSessionModule from '@/services/payment/create-checkout-session';
import { proceedToStripeCheckout } from './proceed-to-stripe-checkout';

// `window.location.href` assignment is the very last step of the happy path.
// bun-test runs in node (no DOM) — install a minimal stub on entry, restore on
// exit. Process-wide leakage caused `raffle-draft-storage.test.ts` to skip its
// own polyfill (`typeof window !== 'undefined'`) and lose `addEventListener`.
type WindowStubGlobal = { window?: unknown };
let originalWindow: unknown;
let installedWindowStub = false;

beforeAll(() => {
	const g = globalThis as WindowStubGlobal;
	originalWindow = g.window;
	g.window = { location: { href: '' } };
	installedWindowStub = true;
});

afterAll(() => {
	if (!installedWindowStub) return;
	const g = globalThis as WindowStubGlobal;
	if (originalWindow === undefined) {
		delete g.window;
	} else {
		g.window = originalWindow;
	}
});

const SUCCESS_ORDER: Order = {
	id: 'order-1',
	raffleId: 'r1',
	userId: 'u1',
	ticketQuantity: 1,
	unitPrice: '10.0000',
	totalAmount: '10.0000',
	currency: 'USD',
	promoCode: null,
	status: ORDER_STATUS.PENDING,
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z',
	raffleName: 'Test Raffle',
	raffleSlug: 'test-raffle',
};

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
		expectedTotal: 0,
	};

	// `mock.restore()` reverts every `spyOn` set during the test, so module
	// replacements (toast, createCheckoutSession) don't leak across files
	// and contaminate `tests/integration/services/payment/...`.
	afterEach(() => {
		mock.restore();
	});

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
	});

	// =========================================================================
	// Pricing-drift guard — F8 from the audit plan.
	//
	// Locks the contract that displayed total ≠ charged total triggers a refresh
	// instead of redirecting to Stripe. Without this, a subscriber-state change
	// between page load and click would charge an amount the user didn't agree to.
	// =========================================================================

	test('refreshes the page when BE total diverges from displayed total beyond tolerance', async () => {
		// User saw $10.00 on the CTA but the BE-built order rounds to $8.00 — e.g.
		// they subscribed mid-session. The drift guard must intercept and refresh.
		const refresh = mock();
		const driftRouter = { refresh } as never;
		spyOn(buildCheckout, 'buildCheckoutOrder').mockResolvedValue({
			order: { ...SUCCESS_ORDER, totalAmount: '8.0000' },
			isFullyDiscounted: false,
		});
		const toastSpy = spyOn(toast, 'error').mockImplementation(
			() => '' as never,
		);

		await proceedToStripeCheckout({
			...opts,
			router: driftRouter,
			expectedTotal: 10,
		});

		expect(refresh).toHaveBeenCalledTimes(1);
		expect(toastSpy).toHaveBeenCalledTimes(1);
	});

	test('proceeds when BE total matches displayed total within the half-cent tolerance', async () => {
		// 0.0001 is well below the 0.005 tolerance — verifies cents-level rounding
		// drift between scaled-int math and JS numbers does not block legit checkouts.
		const refresh = mock();
		const matchRouter = { refresh } as never;
		spyOn(buildCheckout, 'buildCheckoutOrder').mockResolvedValue({
			order: { ...SUCCESS_ORDER, totalAmount: '10.0001' },
			isFullyDiscounted: false,
		});
		const toastSpy = spyOn(toast, 'error').mockImplementation(
			() => '' as never,
		);
		// `spyOn` on the namespace import — Bun preserves ESM live bindings, so
		// the mock impl propagates to `proceed-to-stripe-checkout`'s named import
		// without `mock.module()` (which would leak across the whole test runner).
		spyOn(checkoutSessionModule, 'createCheckoutSession').mockResolvedValue({
			success: true,
			data: {
				id: 'session-1',
				checkoutUrl: 'https://checkout.stripe.com/x',
				orderId: 'order-1',
				expiresAt: '2026-01-01T00:00:00Z',
				previousSessionCancelled: false,
			},
		});

		await proceedToStripeCheckout({
			...opts,
			router: matchRouter,
			expectedTotal: 10,
		});

		expect(refresh).not.toHaveBeenCalled();
		expect(toastSpy).not.toHaveBeenCalled();
	});

	test('refreshes when BE totalAmount is unparseable (NaN cannot be safely compared)', async () => {
		// Without inverted polarity, `Number.isFinite(NaN) && drift > tol` short-circuits
		// false and Stripe gets called with whatever BE sent. Inverted check forces
		// refresh on either side being NaN — defense-in-depth for malformed BE payloads.
		const refresh = mock();
		const nanRouter = { refresh } as never;
		spyOn(buildCheckout, 'buildCheckoutOrder').mockResolvedValue({
			order: { ...SUCCESS_ORDER, totalAmount: 'not-a-number' },
			isFullyDiscounted: false,
		});
		const toastSpy = spyOn(toast, 'error').mockImplementation(
			() => '' as never,
		);

		await proceedToStripeCheckout({
			...opts,
			router: nanRouter,
			expectedTotal: 10,
		});

		expect(refresh).toHaveBeenCalledTimes(1);
		expect(toastSpy).toHaveBeenCalledTimes(1);
	});

	test('skips the drift guard for fully-discounted orders (BE auto-completed at $0)', async () => {
		// Fully-discounted is its own short-circuit — the totalAmount comparison
		// would falsely block a $0 free-tickets flow when expectedTotal is the
		// pre-promo amount.
		const refresh = mock();
		const freeRouter = { refresh } as never;
		spyOn(buildCheckout, 'buildCheckoutOrder').mockResolvedValue({
			order: { ...SUCCESS_ORDER, totalAmount: '0.0000' },
			isFullyDiscounted: true,
		});
		const toastSpy = spyOn(toast, 'error').mockImplementation(
			() => '' as never,
		);

		await proceedToStripeCheckout({
			...opts,
			router: freeRouter,
			expectedTotal: 25,
		});

		expect(refresh).toHaveBeenCalledTimes(1);
		expect(toastSpy).not.toHaveBeenCalled();
	});
});
