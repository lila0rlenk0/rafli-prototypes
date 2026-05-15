import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { PlanRowCTA } from './change-plan-dialog';

const PERIOD_END = 'May 30, 2026';
const NOOP = () => {};

function renderCTA(overrides: {
	isCurrent?: boolean;
	isUpgrade?: boolean;
	isDowngrade?: boolean;
	canScheduleDowngrade?: boolean;
	hasPendingChange?: boolean;
}): string {
	return renderToStaticMarkup(
		<PlanRowCTA
			isCurrent={overrides.isCurrent ?? false}
			isUpgrade={overrides.isUpgrade ?? false}
			isDowngrade={overrides.isDowngrade ?? false}
			canScheduleDowngrade={overrides.canScheduleDowngrade ?? false}
			hasPendingChange={overrides.hasPendingChange ?? false}
			formattedPeriodEnd={PERIOD_END}
			isPending={false}
			onUpgrade={NOOP}
			onDowngrade={NOOP}
		/>,
	);
}

describe('PlanRowCTA', () => {
	describe('current plan', () => {
		test('renders "Current plan" badge with no action button', () => {
			const markup = renderCTA({ isCurrent: true });
			expect(markup).toContain('Current plan');
			// No <button> is rendered on the current-plan branch — pill is
			// purely informational.
			expect(markup).not.toMatch(/<button/);
		});
	});

	describe('upgrade direction', () => {
		test('renders "Upgrade now" CTA with prorated subcopy', () => {
			const markup = renderCTA({ isUpgrade: true });
			expect(markup).toContain('Upgrade now');
			expect(markup).toContain('Prorated charge today');
		});

		test('disables the upgrade CTA when hasPendingChange is true', () => {
			const markup = renderCTA({ isUpgrade: true, hasPendingChange: true });
			expect(markup).toMatch(/disabled=""/);
		});
	});

	describe('downgrade direction with scheduling support', () => {
		test('renders "Switch at renewal" with effective-date subcopy', () => {
			const markup = renderCTA({
				isDowngrade: true,
				canScheduleDowngrade: true,
			});
			expect(markup).toContain('Switch at renewal');
			expect(markup).toContain(`Takes effect ${PERIOD_END}`);
		});

		test('disables the schedule CTA when hasPendingChange is true', () => {
			const markup = renderCTA({
				isDowngrade: true,
				canScheduleDowngrade: true,
				hasPendingChange: true,
			});
			expect(markup).toMatch(/disabled=""/);
		});
	});

	describe('downgrade direction without scheduling support', () => {
		test('disables the CTA and wraps it in a tooltip trigger', () => {
			const markup = renderCTA({
				isDowngrade: true,
				canScheduleDowngrade: false,
			});
			// The button is rendered disabled.
			expect(markup).toMatch(/disabled=""/);
			// Radix Tooltip portals its `Content` so the explanatory copy
			// doesn't render in static markup until open — instead we
			// assert the trigger wraps the button, which is the load-bearing
			// chrome the user interacts with.
			expect(markup).toContain('data-slot="tooltip-trigger"');
		});
	});

	describe('non-matching direction', () => {
		test('returns null when not current, upgrade, or downgrade', () => {
			// All four discriminators false — only happens for an edge case
			// where the plan price equals the current price exactly. The CTA
			// slot should render nothing rather than a stale "Switch" button.
			const markup = renderCTA({});
			expect(markup).toBe('');
		});
	});
});
