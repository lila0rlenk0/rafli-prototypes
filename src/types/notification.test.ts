import { describe, expect, test } from 'bun:test';

import { notificationTypeSchema } from './notification';

describe('notificationTypeSchema', () => {
	test('accepts every backend notification type value', () => {
		// Must match rawNotificationTypeSchema enum — update when BE adds/removes types
		const backendTypes = [
			'chat_message',
			'comment_on_raffle',
			'confirm_receipt_reminder',
			'delivery_confirmed',
			'dispute_deadline_reminder',
			'dispute_opened',
			'dispute_resolved',
			'dispute_under_review',
			'fulfillment_started',
			'host_delivery_confirmation_reminder',
			'host_shipping_reminder',
			'late_order_completion',
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
			'raffle_update_posted',
			'raffle_won',
			'reply_to_comment',
			'review_received',
			'winner_claimed',
		] as const;

		for (const type of backendTypes) {
			expect(notificationTypeSchema.parse(type)).toBe(type);
		}
	});
});
