import 'server-only';

import {
	AxiosError,
	AxiosHeaders,
	type AxiosAdapter,
	type AxiosResponse,
} from 'axios';

import { resolveMock } from './registry';
import { DEFAULT_MOCK_STATE, readMockState } from './state';

/**
 * Parses an axios request body back into a JS value. axios serializes objects
 * to a JSON string via its default `transformRequest` before the adapter runs,
 * so POST resolvers receive a string; non-JSON or absent bodies pass through.
 *
 * @param data - The `config.data` axios hands the adapter
 * @returns The parsed body, or the original value when it isn't JSON
 */
function parseRequestBody(data: unknown): unknown {
	if (typeof data !== 'string') return data;
	try {
		return JSON.parse(data);
	} catch {
		return data;
	}
}

/**
 * Axios adapter that serves local fixtures instead of hitting the network.
 *
 * Attached to the server clients in `@/lib/api/client` only when
 * `env.MOCK_DATA` is true, so the app can be previewed with zero backend
 * running. Every service keeps calling the same client methods and still runs
 * its `schema.parse()` — only the transport is swapped.
 *
 * Unmapped routes reject with a synthetic 404 `AxiosError` (same shape the
 * real HTTP adapter produces) so the domain error mappers translate it to a
 * normal failure code and the affected section degrades gracefully rather than
 * crashing the page.
 *
 * @param config - The axios request config for the intercepted call
 * @returns A resolved `AxiosResponse` carrying fixture data
 */
export const mockAdapter: AxiosAdapter = async function mockAdapter(config) {
	const method = (config.method ?? 'get').toUpperCase();
	const path = (config.url ?? '').split('?')[0];
	// config.params is typed `any` by axios — narrow to the shape buildQueryParams emits.
	const params: Record<string, string> | undefined = config.params;

	// Only authed requests carry an Authorization header, and those never run
	// inside a `'use cache'` scope — so reading cookies() (via readMockState) is
	// safe here. Public cached reads skip it and use the guest default, which
	// they never branch on anyway.
	const hasAuth = Boolean(config.headers?.Authorization);
	const state = hasAuth ? await readMockState() : DEFAULT_MOCK_STATE;

	// axios serializes request bodies to a JSON string before the adapter runs;
	// parse it back so POST resolvers can read fields. Non-JSON bodies pass through.
	const body = parseRequestBody(config.data);

	const data = resolveMock({ method, path, params, body, state });

	if (data === undefined) {
		// Synthesize a 404 response. AxiosError's 5th arg is typed AxiosResponse,
		// but we only populate the fields downstream mappers read (status, data) —
		// the cast is sound because extractErrorCode never touches the rest. This
		// mirrors the synthetic-401 pattern in `client.ts`.
		const syntheticResponse = {
			status: 404,
			data: { message: `No mock registered for ${method} ${path}` },
			headers: {},
			statusText: 'Not Found',
			config,
		};

		return Promise.reject(
			new AxiosError(
				`No mock registered for ${method} ${path}`,
				'ERR_BAD_REQUEST',
				config,
				null,
				syntheticResponse as AxiosResponse,
			),
		);
	}

	return {
		data,
		status: 200,
		statusText: 'OK',
		headers: new AxiosHeaders(),
		config,
	};
};
