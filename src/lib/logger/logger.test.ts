import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { logError, logInfo } from './logger';

/**
 * Capture-and-parse harness: swap `process.stdout.write` /
 * `process.stderr.write` with a recorder, parse each line as JSON, and
 * assert on the parsed shape. This intentionally avoids `mock.module`
 * — the logger has no collaborators to mock, only a side-effect stream
 * that can be substituted directly.
 */
interface WriteSpy {
	readonly lines: string[];
	restore(): void;
}

function spyWrite(stream: 'stdout' | 'stderr'): WriteSpy {
	const target = process[stream];
	const original = target.write.bind(target);
	const lines: string[] = [];

	target.write = ((chunk: string | Uint8Array): boolean => {
		lines.push(
			typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk),
		);
		return true;
	}) as typeof target.write;

	return {
		lines,
		restore: () => {
			target.write = original;
		},
	};
}

function lastJson(spy: WriteSpy): Record<string, unknown> {
	const raw = spy.lines.at(-1);
	if (!raw) throw new Error('no log line captured');
	return JSON.parse(raw.trimEnd()) as Record<string, unknown>;
}

describe('logger', () => {
	let stdout: WriteSpy;
	let stderr: WriteSpy;

	beforeEach(() => {
		stdout = spyWrite('stdout');
		stderr = spyWrite('stderr');
	});

	afterEach(() => {
		stdout.restore();
		stderr.restore();
	});

	describe('logInfo', () => {
		test('writes a single JSON line to stdout', () => {
			logInfo('server_action', { service: 'auth', action: 'sign-in-user' });

			expect(stdout.lines).toHaveLength(1);
			expect(stderr.lines).toHaveLength(0);
			expect(stdout.lines[0].endsWith('\n')).toBe(true);
		});

		test('payload carries base context fields', () => {
			logInfo('server_action', { outcome: 'ok' });
			const payload = lastJson(stdout);

			// Base context — the fields every log line must carry so
			// dashboards can slice by deploy / region / runtime without
			// per-call-site work. If any of these drift, the whole
			// "correlate Sentry and logs by release" story breaks.
			expect(payload.app).toBe('raffly-web');
			expect(typeof payload.timestamp).toBe('string');
			expect(typeof payload.env).toBe('string');
			expect(typeof payload.release).toBe('string');
			expect(typeof payload.runtime).toBe('string');
			expect(typeof payload.region).toBe('string');
			expect(payload.level).toBe('info');
			expect(payload.msg).toBe('server_action');
			expect(payload.outcome).toBe('ok');
		});
	});

	describe('logError', () => {
		test('writes to stderr, not stdout, so drains can alert independently', () => {
			logError('server_action', { outcome: 'error', error_code: 'boom' });

			expect(stdout.lines).toHaveLength(0);
			expect(stderr.lines).toHaveLength(1);

			const payload = lastJson(stderr);
			expect(payload.level).toBe('error');
			expect(payload.error_code).toBe('boom');
		});
	});

	describe('base context integrity', () => {
		test('caller-supplied fields cannot shadow base context or level/msg', () => {
			// `release` drives Sentry↔logs correlation; `env` routes alerts;
			// `level`/`msg` gate severity. A caller accidentally passing any
			// of these in `fields` must not be able to corrupt them — this
			// is the same category of invariant as the wide-event canonical
			// field guarantee.
			logInfo('server_action', {
				app: 'SPOOFED',
				release: 'SPOOFED',
				env: 'SPOOFED',
				runtime: 'SPOOFED',
				region: 'SPOOFED',
				level: 'error',
				msg: 'SPOOFED',
				timestamp: '1999-01-01T00:00:00.000Z',
			});
			const payload = lastJson(stdout);

			expect(payload.app).toBe('raffly-web');
			expect(payload.release).toBe(
				process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown',
			);
			expect(payload.level).toBe('info');
			expect(payload.msg).toBe('server_action');
			// Timestamp is an ISO string minted at emit time — must be
			// after a known-past date, definitely not the spoofed 1999.
			expect(
				Date.parse(payload.timestamp as string) > Date.parse('2024-01-01'),
			).toBe(true);
		});
	});

	describe('redaction pipeline', () => {
		test('scrubs sensitive keys before serialization', () => {
			// End-to-end guarantee: even if a caller accidentally includes
			// `password` in the fields object, the serialized line carries
			// `[REDACTED]`. This is the single most important invariant in
			// this file — logs are the highest-volume exfil path.
			logInfo('probe', { password: 'hunter2', userId: 'u-1' });
			const payload = lastJson(stdout);
			expect(payload.password).toBe('[REDACTED]');
			expect(payload.userId).toBe('u-1');
		});

		test('scrubs email addresses inside freeform message fields', () => {
			logInfo('probe', { detail: 'sent to alice@example.com' });
			const payload = lastJson(stdout);
			expect(payload.detail).toBe('sent to [REDACTED]');
		});
	});
});
