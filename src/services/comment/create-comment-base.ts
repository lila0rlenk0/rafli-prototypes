// Private helper — deliberately NOT a `'use server'` file. If we marked it as
// one, Next.js would expose `createCommentBase` as a client-callable RPC, and
// the `endpoint` parameter would let the browser POST to arbitrary backend
// paths. Instead this module is server-only by transitivity: it imports
// `authenticatedClient` and `getSession`, both of which are themselves
// server-only, so the bundler refuses to ship it to the client regardless.
import { ZodError } from 'zod';

import { COMMENT_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { failure, mapCommentError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	commentSchema,
	type Comment,
	type CreateCommentPayload,
} from '@/types/comment';
import { COMMENT_ERROR_CODES, type CommentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Contract drift telemetry action tag — distinguishes top-level comment from
 * reply in Sentry breadcrumbs. Must match the public action's kebab-case name.
 */
type CreateCommentAction = 'create-comment' | 'create-reply';

/**
 * Shared input for the base helper — caller supplies the already-resolved
 * endpoint path plus the raffle context needed for analytics.
 *
 * `parentCommentId` is optional — when present, it flags this as a reply and
 * is forwarded to Mixpanel so we can segment comment vs reply engagement.
 */
interface CreateCommentBaseInput {
	raffleId: string;
	/** Absolute backend path, e.g. `/raffles/:id/comments` or `.../comments/:cid/replies` */
	endpoint: string;
	payload: CreateCommentPayload;
	/** Telemetry tag — `create-comment` or `create-reply`. Sentry uses this to group drift events. */
	action: CreateCommentAction;
	/** Only set for replies; forwarded to analytics `parent_comment_id` property */
	parentCommentId?: string;
}

/**
 * Shared implementation of the create-comment / create-reply server actions.
 *
 * Both public actions are near-identical POST → Zod parse → fire-and-forget
 * analytics pipelines. Keeping the logic in one place avoids drift between
 * the two code paths (previously a >95% duplicated pair). Each public action
 * remains a thin wrapper so callers' import paths stay stable and Sentry
 * still sees distinct `action` tags on contract drift.
 *
 * @param input - Endpoint, payload, and telemetry metadata
 * @returns ServiceResponse with the validated comment/reply entity or an error code
 */
export async function createCommentBase(
	input: CreateCommentBaseInput,
): Promise<ServiceResponse<Comment, CommentErrorCode>> {
	// Resolve session in parallel with the POST — we only need it for the
	// fire-and-forget analytics tracker on the success path, so blocking on
	// cookies would add latency to the comment UX for no reason.
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Submit comment/reply to backend. The caller pre-built the
		// endpoint path because comment vs reply live under different URL shapes
		// and we don't want this helper to own that routing logic.
		const response = await authenticatedClient.post(
			input.endpoint,
			input.payload,
		);

		// Step 2: Validate response shape against schema — throws ZodError into
		// the catch below where it becomes a contract-drift event, not a crash.
		const validated = commentSchema.parse(response.data);

		// Step 3: Must `await` trackAfter — it resolves IP via headers() in
		// request scope then defers Mixpanel via after(). `void trackAfter(...)`
		// would run headers() post-response and throw.
		// `is_reply` / `parent_comment_id` are only set when we're in reply mode,
		// mirroring the property shape the previous two files emitted so
		// downstream dashboards keep working without a schema migration.
		const session = await sessionPromise;
		await trackAfter(
			COMMENT_EVENTS.CREATED,
			{
				raffle_id: input.raffleId,
				comment_id: validated.id,
				is_reply: input.parentCommentId !== undefined,
				body_length: input.payload.body.length,
				// Only include parent_comment_id key when actually replying —
				// avoids littering top-level comment events with `undefined` fields
				...(input.parentCommentId !== undefined && {
					parent_comment_id: input.parentCommentId,
				}),
			},
			{ userId: session?.user?.id },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			// Tag drift with the caller's action so Sentry can distinguish
			// comment vs reply contract breaks at a glance.
			captureContractDrift(error, 'comment', input.action);
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
