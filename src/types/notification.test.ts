import { describe, expect, test } from 'bun:test';

import { notificationTypeSchema } from './notification';

describe('notificationTypeSchema', () => {
	test('accepts every backend notification type value', () => {
		const backendTypes = [
			'delivery_confirmed',
			'dispute_opened',
			'dispute_resolved',
			'fulfillment_started',
			'host_delivery_confirmation_reminder',
			'host_shipping_reminder',
			'new_raffle_created',
			'order_confirmed',
			'partial_participation_completed',
			'partial_participation_host',
			'partial_participation_non_winner',
			'partial_participation_winner',
			'prize_auto_confirmed',
			'prize_claim_reminder',
			'prize_delivered',
			'prize_sent',
			'raffle_cancelled',
			'raffle_completed',
			'raffle_ending_soon',
			'raffle_started',
			'raffle_won',
			'review_received',
			'winner_claimed',
		] as const;

		for (const type of backendTypes) {
			expect(notificationTypeSchema.parse(type)).toBe(type);
		}
	});

	test('maps deprecated partial_raffle_* values to current equivalents', () => {
		const deprecatedToCurrentMap = [
			['partial_raffle_host', 'partial_participation_host'],
			['partial_raffle_non_winner', 'partial_participation_non_winner'],
			['partial_raffle_winner', 'partial_participation_winner'],
		] as const;

		for (const [deprecated, current] of deprecatedToCurrentMap) {
			expect(notificationTypeSchema.parse(deprecated)).toBe(current);
		}
	});
});
