import { getCancellationReason } from '@/lib/utils/raffle/cancellation-reason';
import type { CancellationReason } from '@/lib/utils/raffle/cancellation-reason';
import {
	COMMENTABLE_STATUSES,
	type CommentableStatus,
	CONCLUDED_STATUSES,
	type ConcludedStatus,
	PROMO_MANAGEABLE_STATUSES,
	type PromoManageableStatus,
	RAFFLE_STATUS,
	UPDATE_MANAGEABLE_STATUSES,
	type UpdateManageableStatus,
} from '@/types/raffle';

import type { RaffleDetailPublic } from './raffle-page-loader';

export interface RaffleViewState {
	isConcluded: boolean;
	isCancelled: boolean;
	hasWinners: boolean;
	isOwner: boolean;
	showEditButton: boolean;
	disablePurchase: boolean;
	showHostFulfillment: boolean;
	showDrawInProgress: boolean;
	showCancelledCard: boolean;
	showActiveCard: boolean;
	canManageUpdates: boolean;
	isCommentable: boolean;
	isPromoManageable: boolean;
	showKycNotice: boolean;
	showShareMarquee: boolean;
	shouldFetchKycStatus: boolean;
	cancellationReason: CancellationReason | null;
	availableTickets: number;
	ticketPrice: number;
}

export interface DeriveRaffleViewStateInput {
	read: RaffleDetailPublic;
	currentUserId: string | null;
}

export function deriveRaffleViewState({
	read,
	currentUserId,
}: DeriveRaffleViewStateInput): RaffleViewState {
	const { raffle } = read;

	const isConcluded = CONCLUDED_STATUSES.includes(
		raffle.status as ConcludedStatus,
	);
	const isCancelled = raffle.status === RAFFLE_STATUS.CANCELLED;
	const hasWinners = (raffle.winners?.length ?? 0) > 0;
	const isOwner = currentUserId === raffle.hostId;

	const showEditButton = isOwner && raffle.status === RAFFLE_STATUS.DRAFT;
	const disablePurchase = isOwner && raffle.status === RAFFLE_STATUS.LIVE;

	const showHostFulfillment = isOwner && isConcluded && hasWinners;
	const showDrawInProgress = isConcluded && !hasWinners;

	const cancellationReason = getCancellationReason(raffle);
	const showCancelledCard = isCancelled && cancellationReason !== null;
	const showActiveCard = !isConcluded && !isCancelled;

	const canManageUpdates = UPDATE_MANAGEABLE_STATUSES.includes(
		raffle.status as UpdateManageableStatus,
	);
	const isCommentable = COMMENTABLE_STATUSES.includes(
		raffle.status as CommentableStatus,
	);
	const isPromoManageable = PROMO_MANAGEABLE_STATUSES.includes(
		raffle.status as PromoManageableStatus,
	);

	const showKycNotice = showActiveCard;
	const showShareMarquee = showActiveCard && !hasWinners;
	const shouldFetchKycStatus = isConcluded;

	const availableTickets = Math.max(
		0,
		raffle.maxParticipants - raffle.participantsCount,
	);
	const ticketPrice = Number.parseFloat(raffle.ticketPriceAmount);

	return {
		isConcluded,
		isCancelled,
		hasWinners,
		isOwner,
		showEditButton,
		disablePurchase,
		showHostFulfillment,
		showDrawInProgress,
		showCancelledCard,
		showActiveCard,
		canManageUpdates,
		isCommentable,
		isPromoManageable,
		showKycNotice,
		showShareMarquee,
		shouldFetchKycStatus,
		cancellationReason,
		availableTickets,
		ticketPrice,
	};
}
