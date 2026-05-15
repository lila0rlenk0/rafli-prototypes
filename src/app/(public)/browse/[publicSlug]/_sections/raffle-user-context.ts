import 'server-only';

import { cache } from 'react';

import { getCreditBalance } from '@/services/payment/get-credit-balance';
import { getVerificationStatus } from '@/services/kyc-submission/get-verification-status';
import { getMySubscription } from '@/services/subscription/get-my-subscription';
import { getMyTicketCodes } from '@/services/ticket/get-my-ticket-codes';
import { getMe } from '@/services/user/get-me';
import { getMyWinnings } from '@/services/winning/get-my-winnings';
import {
	INACTIVE_SUBSCRIPTION_CONTEXT,
	type RaffleSubscriptionContext,
	SUBSCRIPTION_STATUS,
	type SubscriptionStatus,
} from '@/types/subscription';
import type { AuthUser } from '@/types/auth';
import type { Raffle } from '@/types/raffle';
import type { TicketCode } from '@/types/ticket';
import type { VerificationStatus } from '@/types/verification-status';
import type { Winning } from '@/types/winning';

/** Session-derived fields for async raffle column slots; never on the public paint path. */
export interface RaffleUserContext {
	isAuthenticated: boolean;
	currentUserId: string | null;
	myTicketCodes: TicketCode[];
	myTicketsTotal: number;
	myWinning: Winning | null;
	myUserName: string | null;
	myUserAvatarUrl: string | null;
	availableCredits: string | null;
	kycWinnerStatus: VerificationStatus | null;
	subscription: RaffleSubscriptionContext;
}

const EMPTY_CONTEXT: RaffleUserContext = {
	isAuthenticated: false,
	currentUserId: null,
	myTicketCodes: [],
	myTicketsTotal: 0,
	myWinning: null,
	myUserName: null,
	myUserAvatarUrl: null,
	availableCredits: null,
	kycWinnerStatus: null,
	subscription: INACTIVE_SUBSCRIPTION_CONTEXT,
};

// Subscription statuses that grant active benefits (discount applied at checkout).
// Mirrors `payments.getActiveSubscriptionInfoInternal` — `cancelled` and `past_due`
// retain benefits until period end / dunning resolves, so they count as active here.
// Array .includes is fine for a fixed 3-element union — Set adds an allocation
// per request without measurable benefit at this size.
const ACTIVE_BENEFIT_STATUSES: readonly SubscriptionStatus[] = [
	SUBSCRIPTION_STATUS.ACTIVE,
	SUBSCRIPTION_STATUS.CANCELLED,
	SUBSCRIPTION_STATUS.PAST_DUE,
];

/**
 * Fetches the current user's subscription context, deduped per-request via
 * React.cache. Both `buildUserContext` (for the inline ticket purchase card)
 * and the page-level sticky CTA call this so they share a single network
 * round-trip and never display divergent subscriber-discount math.
 *
 * Returns the inactive sentinel for guests / fetch failures / expired states
 * — the price breakdown then renders the un-discounted total, matching what
 * the BE will actually charge.
 */
export const getRaffleSubscriptionContext = cache(
	async function getRaffleSubscriptionContextImpl(
		isAuthenticated: boolean,
	): Promise<RaffleSubscriptionContext> {
		// `cache(async fn)` already wraps the return in a Promise, so a plain
		// return here is identical to `Promise.resolve(...)` from the caller's
		// perspective — no need for a pre-resolved constant.
		if (!isAuthenticated) return INACTIVE_SUBSCRIPTION_CONTEXT;
		const result = await getMySubscription();
		return resolveSubscriptionContext(result);
	},
);

export async function buildUserContext(
	raffle: Raffle,
	user: AuthUser | null,
	options: { shouldFetchKycStatus: boolean },
): Promise<RaffleUserContext> {
	const { shouldFetchKycStatus } = options;
	if (!user) return EMPTY_CONTEXT;

	const [tickets, winnings, me, credits, verification, subscription] =
		await Promise.all([
			getMyTicketCodes({ raffleId: raffle.id }),
			getMyWinnings(),
			getMe(),
			getCreditBalance(),
			shouldFetchKycStatus ? getVerificationStatus() : Promise.resolve(null),
			// Subscription drives the subscriber-discount preview in TicketPurchaseCard.
			// React.cache-deduped via `getRaffleSubscriptionContext` so the page-level
			// sticky CTA reads from the same in-flight fetch — single round-trip per request.
			getRaffleSubscriptionContext(true),
		]);

	const winning = winnings.success
		? (winnings.data.winnings.find(w => w.raffleId === raffle.id) ?? null)
		: null;

	return {
		isAuthenticated: true,
		currentUserId: user.id,
		myTicketCodes: tickets.success ? tickets.data.tickets : [],
		myTicketsTotal: tickets.success ? tickets.data.total : 0,
		myWinning: winning,
		myUserName: me.success ? me.data.name : null,
		myUserAvatarUrl: me.success ? me.data.avatarUrl : null,
		availableCredits: credits.success ? credits.data.availableAmount : null,
		kycWinnerStatus: verification?.success
			? verification.data.kycWinner.status
			: null,
		subscription,
	};
}

/**
 * Map the server-action result into the slim FE shape. Fetch failure / no
 * subscription / expired all collapse to the inactive sentinel — the price
 * breakdown then shows the un-discounted total, matching what BE will charge.
 */
function resolveSubscriptionContext(
	result: Awaited<ReturnType<typeof getMySubscription>>,
): RaffleSubscriptionContext {
	// Wrapper shape: a successful response always has `data` populated, but
	// `data.subscription` is null for users who never subscribed or whose
	// subscription has fully expired — both collapse to the inactive sentinel.
	if (!result.success || result.data.subscription === null) {
		return INACTIVE_SUBSCRIPTION_CONTEXT;
	}
	const sub = result.data.subscription;
	if (!ACTIVE_BENEFIT_STATUSES.includes(sub.status)) {
		return INACTIVE_SUBSCRIPTION_CONTEXT;
	}
	// `cancelled` / `past_due` retain benefits *until* `currentPeriodEnd`.
	// Past that timestamp the BE charges full price; if we keep showing the
	// discount the drift guard refresh-loops the user. Treat as inactive once
	// the period has lapsed so the breakdown matches what BE will charge.
	if (Date.parse(sub.currentPeriodEnd) <= Date.now()) {
		return INACTIVE_SUBSCRIPTION_CONTEXT;
	}
	// `discountPercent` is part of the embedded plan — no extra round-trip.
	return {
		discountPercent: sub.plan.discountPercent,
		isActive: true,
		planName: sub.plan.name,
	};
}
