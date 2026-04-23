import { afterAll, describe, expect, test } from 'bun:test';
import type { ErrorEvent } from '@sentry/nextjs';

import { scrubSensitiveServiceContext } from './filter';

describe('scrubSensitiveServiceContext (wallet/tx leak to Sentry vendor mitigated)', () => {
	const env = process.env as { NODE_ENV?: string };
	const oldEnv = env.NODE_ENV;

	afterAll(() => {
		env.NODE_ENV = oldEnv;
	});

	test('redacts sensitive service context keys in production', () => {
		env.NODE_ENV = 'production';
		const event = {
			type: 'error',
			contexts: {
				service: {
					service: 'payment',
					action: 'x',
					walletAddress: '0xabc',
					txHash: '0xdef',
					orderId: 'ord1',
					submissionId: 'sub1',
				},
			},
		} as unknown as ErrorEvent;
		const out = scrubSensitiveServiceContext(event);
		const svc = out.contexts?.service as Record<string, string>;
		expect(svc.walletAddress).toBe('[redacted]');
		expect(svc.txHash).toBe('[redacted]');
		expect(svc.orderId).toBe('[redacted]');
		expect(svc.submissionId).toBe('[redacted]');
		expect(svc.service).toBe('payment');
	});

	test('no-op outside production', () => {
		env.NODE_ENV = 'development';
		const event = {
			type: 'error',
			contexts: { service: { walletAddress: '0xkeep' } },
		} as unknown as ErrorEvent;
		const out = scrubSensitiveServiceContext(event);
		expect(
			(out.contexts?.service as { walletAddress: string }).walletAddress,
		).toBe('0xkeep');
	});
});
