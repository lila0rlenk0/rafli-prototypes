import 'server-only';

import { env } from '@/env/server';
import type { Raffle } from '@/types/raffle';

import {
	buildMockSubscriptionEnvelope,
	MOCK_CATEGORIES,
	MOCK_COMPLETED_RAFFLES,
	MOCK_FEATURED_RAFFLES,
	MOCK_LIVE_RAFFLES,
	MOCK_ME,
	MOCK_RECENT_WINNERS,
} from './fixtures';
import { type MockState, subscriptionStatusForState } from './state';

/** Every raffle fixture, across lifecycle states — used for slug lookups. */
const ALL_RAFFLES: readonly Raffle[] = [
	...MOCK_LIVE_RAFFLES,
	...MOCK_COMPLETED_RAFFLES,
];

/** Axios `config.params` after `buildQueryParams` — flat string map. */
type MockParams = Record<string, string> | undefined;

/**
 * Wraps a raffle list in the standard pagination envelope expected by
 * `listRafflesResponseSchema`. Single page — the fixture pool is small enough
 * that pagination never kicks in for preview purposes.
 *
 * @param raffles - The raffles to return on this (only) page
 * @returns A `ListRafflesResponse`-shaped object
 */
function paginated(raffles: readonly Raffle[]) {
	return {
		limit: raffles.length,
		page: 1,
		total: raffles.length,
		totalPages: 1,
		raffles,
	};
}

/**
 * Resolves the `/raffles` list endpoint, honouring the `status` filter the
 * landing + browse surfaces pass (`live` drives the grid, `completed` drives
 * the past-draws carousel). Comma-separated statuses match if any token does.
 *
 * @param params - Query params (`status`, `limit`, `sort`, ...)
 * @returns A paginated raffle envelope
 */
function resolveRaffles(params: MockParams) {
	const status = params?.status ?? 'live';
	const wanted = new Set(status.split(',').map(s => s.trim()));

	const pool = wanted.has('completed')
		? MOCK_COMPLETED_RAFFLES
		: MOCK_LIVE_RAFFLES;

	const limit = params?.limit ? Number(params.limit) : pool.length;
	return paginated(pool.slice(0, limit));
}

/** A normalised inbound request the resolver matches against. */
export interface MockRequest {
	/** Upper-cased HTTP method. */
	readonly method: string;
	/** Request path with the query string already stripped. */
	readonly path: string;
	/** Parsed query params from axios config. */
	readonly params: MockParams;
	/** Parsed JSON request body (POST/PUT/PATCH), or undefined. */
	readonly body: unknown;
	/** Active mock state — drives auth-scoped responses (e.g. subscription). */
	readonly state: MockState;
}

/** Plan slugs the subscribe funnel posts, mapped to their pending-page tier. */
const PENDING_TIERS = new Set(['pro', 'basic', 'starter']);

/**
 * Narrows an unknown JSON body to a string-keyed record without leaking `any`.
 *
 * @param value - The parsed request body
 * @returns The body as a record, or an empty object when not an object
 */
function asRecord(value: unknown): Record<string, unknown> {
	// Cast is sound: guarded by the typeof/null check, and callers only read
	// string fields off the result with their own typeof checks.
	return typeof value === 'object' && value !== null
		? (value as Record<string, unknown>)
		: {};
}

/**
 * Resolves the subscription checkout POST. Instead of a Fanbasis hosted URL,
 * returns a local URL pointing at the matching `/subscription-pending-{tier}`
 * page so the Buy flow lands on the real post-checkout state without leaving
 * localhost. The buyer's email is forwarded so the pending page personalises.
 *
 * @param body - The `{ email, planSlug }` request body
 * @returns A `{ checkoutUrl }` envelope pointing at the local pending page
 */
function resolveSubscriptionCheckout(body: unknown) {
	const record = asRecord(body);
	const planSlug =
		typeof record.planSlug === 'string' ? record.planSlug : 'pro_access_pass';
	const email = typeof record.email === 'string' ? record.email : '';

	const rawTier = planSlug.replace(/_access_pass$/, '');
	const tier = PENDING_TIERS.has(rawTier) ? rawTier : 'pro';
	const query = email ? `?email=${encodeURIComponent(email)}` : '';

	return { checkoutUrl: `${env.APP_URL}/subscription-pending-${tier}${query}` };
}

/**
 * Handles the POST endpoints the preview funnel needs. Currently just the
 * public subscription checkout; everything else falls through to a 404.
 *
 * @param route - Normalised request path
 * @param body - Parsed JSON request body
 * @returns Fixture payload, or undefined when no mock is registered
 */
function resolvePost(route: string, body: unknown): unknown {
	if (route === '/payments/fanbasis/public-subscription-checkout') {
		return resolveSubscriptionCheckout(body);
	}
	return undefined;
}

/**
 * Maps an inbound request to fixture data for the public + authed read
 * endpoints the preview surfaces depend on. Returns `undefined` for anything
 * unmapped so the adapter can synthesize a 404 and the calling service
 * degrades through its normal failure path.
 *
 * @param request - The normalised request (method, path, params, state)
 * @returns Fixture payload, or `undefined` when no mock is registered
 */
export function resolveMock(request: MockRequest): unknown {
	const { method, path, params, state, body } = request;

	// Normalise: drop a trailing slash so '/categories/' matches '/categories'.
	const route = path.length > 1 ? path.replace(/\/$/, '') : path;

	if (method === 'POST') return resolvePost(route, body);
	if (method !== 'GET') return undefined;

	switch (route) {
		case '/raffles':
			return resolveRaffles(params);
		case '/raffles/featured':
			return { raffles: MOCK_FEATURED_RAFFLES };
		case '/winnings/recent':
			return { winners: MOCK_RECENT_WINNERS };
		case '/categories':
			return { categories: MOCK_CATEGORIES, total: MOCK_CATEGORIES.length };
		case '/me':
			return MOCK_ME;
		case '/me/subscription':
			return buildMockSubscriptionEnvelope(subscriptionStatusForState(state));
		default:
			return resolveDynamicRoute(route);
	}
}

/**
 * Handles parameterised routes that a literal switch can't match. Currently
 * just the raffle detail endpoint `GET /raffles/:slug`, looked up by
 * `publicSlugOrCode`. Returns the bare raffle object (the detail service parses
 * it with `raffleSchema`, not a list envelope).
 *
 * @param route - Normalised request path
 * @returns The matching raffle, or `undefined` when nothing matches
 */
function resolveDynamicRoute(route: string): unknown {
	const detailMatch = /^\/raffles\/([^/]+)$/.exec(route);
	if (detailMatch) {
		const slug = decodeURIComponent(detailMatch[1]);
		return ALL_RAFFLES.find(r => r.publicSlugOrCode === slug);
	}

	return undefined;
}
