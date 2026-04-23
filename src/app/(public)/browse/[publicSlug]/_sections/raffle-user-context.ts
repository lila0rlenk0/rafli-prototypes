import 'server-only';

import { getCreditBalance } from '@/services/payment/get-credit-balance';
import { getVerificationStatus } from '@/services/kyc-submission/get-verification-status';
import { getMyTicketCodes } from '@/services/ticket/get-my-ticket-codes';
import { getMe } from '@/services/user/get-me';
import { getMyWinnings } from '@/services/winning/get-my-winnings';
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
};

export async function buildUserContext(
	raffle: Raffle,
	user: AuthUser | null,
	options: { shouldFetchKycStatus: boolean },
): Promise<RaffleUserContext> {
	const { shouldFetchKycStatus } = options;
	if (!user) return EMPTY_CONTEXT;

	const [tickets, winnings, me, credits, verification] = await Promise.all([
		getMyTicketCodes({ raffleId: raffle.id }),
		getMyWinnings(),
		getMe(),
		getCreditBalance(),
		shouldFetchKycStatus ? getVerificationStatus() : Promise.resolve(null),
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
	};
}
