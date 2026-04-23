import { describe, expect, test } from 'bun:test';

import type { Message } from '@/types/chat';
import { WINNING_STATUS } from '@/types/winning';

import { deriveWinningStatusFromMessages } from './winning-status-from-messages';

/**
 * Baseline shape reused across tests. The derivation only reads `type`
 * and `metadata.{toStatus,winningId}` — every other field is unused by
 * the function but required by the `Message` type, so we pin them to
 * neutral values and override per test.
 */
const BASE_MESSAGE: Message = {
	body: null,
	conversationId: 'conv-1',
	createdAt: '2026-04-18T00:00:00.000Z',
	deletedAt: null,
	editedAt: null,
	id: 'msg-1',
	mediaType: null,
	mediaUrl: null,
	metadata: null,
	senderId: 'user-1',
	type: 'system',
};

const WINNING_ID = 'win-1';

function shipmentMessage(id: string, toStatus: string): Message {
	return {
		...BASE_MESSAGE,
		id,
		type: 'shipment_update',
		metadata: {
			fromStatus: WINNING_STATUS.PENDING,
			toStatus,
			proofUrl: null,
			hostNotes: null,
			winningId: WINNING_ID,
		},
	};
}

describe('deriveWinningStatusFromMessages', () => {
	describe('defaults', () => {
		test('empty list → pending + null winningId', () => {
			expect(deriveWinningStatusFromMessages([])).toEqual({
				status: WINNING_STATUS.PENDING,
				winningId: null,
			});
		});

		test('no shipment_update messages → pending + null winningId', () => {
			const messages: Message[] = [
				{ ...BASE_MESSAGE, id: 'a', type: 'text', body: 'hello' },
				{ ...BASE_MESSAGE, id: 'b', type: 'system', body: 'Welcome.' },
			];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.PENDING,
				winningId: null,
			});
		});

		test('shipment_update without metadata → pending + null winningId', () => {
			const messages: Message[] = [
				{ ...BASE_MESSAGE, id: 'a', type: 'shipment_update', metadata: null },
			];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.PENDING,
				winningId: null,
			});
		});
	});

	describe('mainline transitions', () => {
		test('awaiting_host', () => {
			const messages = [shipmentMessage('a', WINNING_STATUS.AWAITING_HOST)];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.AWAITING_HOST,
				winningId: WINNING_ID,
			});
		});

		test('sent', () => {
			const messages = [shipmentMessage('a', WINNING_STATUS.SENT)];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.SENT,
				winningId: WINNING_ID,
			});
		});

		test('delivered', () => {
			const messages = [shipmentMessage('a', WINNING_STATUS.DELIVERED)];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.DELIVERED,
				winningId: WINNING_ID,
			});
		});

		test('received', () => {
			const messages = [shipmentMessage('a', WINNING_STATUS.RECEIVED)];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.RECEIVED,
				winningId: WINNING_ID,
			});
		});
	});

	describe('dispute branch', () => {
		test('disputed', () => {
			const messages = [shipmentMessage('a', WINNING_STATUS.DISPUTED)];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.DISPUTED,
				winningId: WINNING_ID,
			});
		});

		test('resolved', () => {
			const messages = [shipmentMessage('a', WINNING_STATUS.RESOLVED)];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.RESOLVED,
				winningId: WINNING_ID,
			});
		});
	});

	describe('ordering', () => {
		test('latest shipment_update wins over earlier ones', () => {
			// Ascending order — conversation-view hydrates oldest-first.
			const messages = [
				shipmentMessage('a', WINNING_STATUS.AWAITING_HOST),
				shipmentMessage('b', WINNING_STATUS.SENT),
				shipmentMessage('c', WINNING_STATUS.DELIVERED),
			];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.DELIVERED,
				winningId: WINNING_ID,
			});
		});

		test('later non-shipment messages do not shadow a prior shipment_update', () => {
			const messages: Message[] = [
				shipmentMessage('a', WINNING_STATUS.SENT),
				{ ...BASE_MESSAGE, id: 'b', type: 'text', body: 'thanks!' },
			];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.SENT,
				winningId: WINNING_ID,
			});
		});
	});

	describe('resilience', () => {
		test('unknown toStatus token falls back to pending but keeps winningId', () => {
			// Simulates a backend enum addition the client hasn't shipped
			// yet. The UUID is contract-stable so action CTAs still target
			// the right row; the visual falls back to the initial step.
			const messages = [shipmentMessage('a', 'quantum_superposition')];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.PENDING,
				winningId: WINNING_ID,
			});
		});

		test('legacy pending_partial_fulfillment is preserved as-is', () => {
			// Historic DB rows may still carry this token; the label map /
			// stepper both collapse it to the pending step at render time.
			const messages = [
				shipmentMessage('a', WINNING_STATUS.PENDING_PARTIAL_FULFILLMENT),
			];
			expect(deriveWinningStatusFromMessages(messages)).toEqual({
				status: WINNING_STATUS.PENDING_PARTIAL_FULFILLMENT,
				winningId: WINNING_ID,
			});
		});
	});
});
