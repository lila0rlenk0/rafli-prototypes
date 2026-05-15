import { describe, expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

// `useInvalidateMySubscription` reads `useQueryClient`, which throws without
// a `QueryClientProvider` in scope. The banner only needs the callback for
// click handling — replace the hook with a no-op so the render path is pure.
// Deliberately do NOT mock `cancel-scheduled-change` here — `mock.module` is
// process-wide and would override the real action for sibling integration
// tests that share the Bun runner; the component test only renders, never
// clicks, so the action import resolves but never executes.
mock.module('@/services/subscription/use-my-subscription', () => ({
	useInvalidateMySubscription: () => async () => {},
	useMySubscription: () => ({ data: undefined }),
}));

// `server-only` throws at import time outside an RSC; the test preload neutralises
// it for integration tests, but the component-test entry runs separately so we
// need our own stub. Same shape as `tests/preload.ts`.
mock.module('server-only', () => ({}));

const { ScheduledChangeBanner } = await import('./scheduled-change-banner');

const SUBSCRIPTION_ID = '01929e55-9b1a-7c32-8ae0-0123456789ab';
const PENDING_PLAN = {
	id: '01929e55-9b1a-7c32-8ae0-deadbeefcafe',
	name: 'Starter',
	monthlyPriceAmount: '5.00',
};
const EFFECTIVE_AT = '2026-06-01T00:00:00.000Z';

describe('ScheduledChangeBanner', () => {
	describe('visibility gate', () => {
		test('returns null when pendingPlan is null', () => {
			const markup = renderToStaticMarkup(
				<ScheduledChangeBanner
					subscriptionId={SUBSCRIPTION_ID}
					pendingPlan={null}
					effectiveAt={EFFECTIVE_AT}
					canCancel
				/>,
			);
			expect(markup).toBe('');
		});

		test('returns null when effectiveAt is null', () => {
			const markup = renderToStaticMarkup(
				<ScheduledChangeBanner
					subscriptionId={SUBSCRIPTION_ID}
					pendingPlan={PENDING_PLAN}
					effectiveAt={null}
					canCancel
				/>,
			);
			expect(markup).toBe('');
		});

		test('renders banner when pendingPlan and effectiveAt are set', () => {
			const markup = renderToStaticMarkup(
				<ScheduledChangeBanner
					subscriptionId={SUBSCRIPTION_ID}
					pendingPlan={PENDING_PLAN}
					effectiveAt={EFFECTIVE_AT}
					canCancel
				/>,
			);
			expect(markup).toContain('Downgrade scheduled');
			expect(markup).toContain('Starter');
			expect(markup).toContain('Cancel scheduled change');
		});
	});

	describe('cancel CTA gating', () => {
		test('disables the cancel button when canCancel is false', () => {
			const markup = renderToStaticMarkup(
				<ScheduledChangeBanner
					subscriptionId={SUBSCRIPTION_ID}
					pendingPlan={PENDING_PLAN}
					effectiveAt={EFFECTIVE_AT}
					canCancel={false}
				/>,
			);
			// The `disabled` HTML attribute (not the `disabled:*` Tailwind
			// modifiers inside `class`) — match a quoted attribute so the
			// className utilities don't false-positive the assertion.
			expect(markup).toMatch(/disabled=""/);
		});

		test('enables the cancel button when canCancel is true', () => {
			const markup = renderToStaticMarkup(
				<ScheduledChangeBanner
					subscriptionId={SUBSCRIPTION_ID}
					pendingPlan={PENDING_PLAN}
					effectiveAt={EFFECTIVE_AT}
					canCancel
				/>,
			);
			expect(markup).not.toMatch(/disabled=""/);
		});
	});
});
