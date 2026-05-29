import 'server-only';

import type { z } from 'zod';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ZodError } from 'zod';

import { captureContractDrift } from '@/lib/sentry/capture';
import { failure, success } from '@/lib/errors';
import type { ServiceResponse } from '@/types/service-response';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface CallServiceOptions<T, E extends string> {
	client: AxiosInstance;
	method: HttpMethod;
	url: string;
	schema: z.ZodSchema<T>;
	/** Domain name forwarded to captureContractDrift (e.g. 'notification') */
	domain: string;
	/** Action name forwarded to captureContractDrift (e.g. 'get-unread-count') */
	action: string;
	/** Error code returned on ZodError (contract drift) */
	driftCode: E;
	/** Error mapper for non-Zod failures */
	mapError: (error: unknown) => E;
	/** Request body — ignored for GET/DELETE at the network level */
	data?: unknown;
	/** Extra Axios config (params, headers, timeout, …) */
	config?: AxiosRequestConfig;
}

/**
 * Single-call service helper. Executes one HTTP request through the provided
 * Axios client, parses the response through a Zod schema, and returns a
 * `ServiceResponse`. Contract drift (ZodError) is captured to Sentry and
 * mapped to `driftCode`; all other failures are mapped through `mapError`.
 *
 * Use only for trivial single-call actions with no pre- or post-call logic.
 * Actions that need caching directives (`'use cache'`), session resolution,
 * `captureServiceError`, or multiple client calls should keep their own
 * try/catch.
 *
 * @param opts - Request options; see {@link CallServiceOptions} for field docs
 * @returns ServiceResponse with parsed data on success, error code on failure
 */
export async function callService<T, E extends string>(
	opts: CallServiceOptions<T, E>,
): Promise<ServiceResponse<T, E>> {
	try {
		// Axios splits its call signature by method: GET/DELETE → (url, config);
		// POST/PUT/PATCH → (url, data, config). The branch mirrors that contract
		// so integration tests can keep mocking `client.get` / `client.post`
		// directly rather than the lower-level `client.request`.
		const response =
			opts.method === 'get' || opts.method === 'delete'
				? await opts.client[opts.method](opts.url, opts.config)
				: await opts.client[opts.method](opts.url, opts.data, opts.config);

		return success(opts.schema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, opts.domain, opts.action);
			return failure(opts.driftCode);
		}
		return failure(opts.mapError(error));
	}
}
