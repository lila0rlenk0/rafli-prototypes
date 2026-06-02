import { InfoIcon } from 'lucide-react';

import { FulfillmentTimeline } from '@/components/fulfillment/timeline';
import { HostFulfillmentCard } from '@/components/fulfillment/host-card';
import { CreditPayoutCard } from '@/components/raffle/cards/credit-payout-card';
import { PrizeBreakdownCard } from '@/components/raffle/cards/prize-breakdown-card';
import { RaffleCancelledCard } from '@/components/raffle/cards/cancelled-card';
import { RaffleInfoCard } from '@/components/raffle/info-card/info-card';
import { RaffleNotWonCard } from '@/components/raffle/cards/not-won-card';
import { RaffleWonCard } from '@/components/raffle/cards/won-card';
import { RevenueBreakdownCard } from '@/components/raffle/cards/revenue-breakdown-card';
import { ChooseEntryBlock } from '@/components/raffle/ticket-purchase/choose-entry-block';
import { WinnersList } from '@/components/raffle/winners/winners-list';
import { CommentSection } from '@/components/raffle/comments/section';
import { ReportRaffleButton } from '@/components/browse/public-slug/report-raffle-button';
import { ShareOnXButton } from '@/components/browse/public-slug/share-on-x-button';
import { getCurrentUser } from '@/lib/auth/session';
import { isPartialParticipation } from '@/lib/utils/raffle/partial-participation';
import { getMyTicketCodes } from '@/services/ticket/get-my-ticket-codes';
import type { Raffle } from '@/types/raffle';
import type { XShareConfig } from '@/components/browse/public-slug/x-share/use-share';

import type { RaffleViewState } from './raffle-page-derived';
import {
	buildUserContext,
	type RaffleUserContext,
} from './raffle-user-context';

interface RaffleRightColumnAsyncProps {
	raffle: Raffle;
	publicSlug: string;
	view: RaffleViewState;
	xShareConfig: XShareConfig;
}

/**
 * User-aware right-column content — winner state, host fulfillment, active
 * card purchase UI, winners list, and the user-aware RaffleInfoCard. Reads
 * `getCurrentUser` (React.cache-wrapped) so the JWT decode is deduped across
 * every async sibling in this request (per `.claude/rules/lib.md`).
 *
 * @returns The user-aware right-column content
 */
export async function RaffleRightColumnAsync({
	raffle,
	publicSlug,
	view,
	xShareConfig,
}: RaffleRightColumnAsyncProps) {
	const user = await getCurrentUser();
	const ctx = await buildUserContext(raffle, user, {
		shouldFetchKycStatus: view.shouldFetchKycStatus,
	});

	// Non-winner / non-host viewers of a partial-participation raffle see the
	// CreditPayoutCard at the parent level — WinnerBlock/HostFulfillmentBlock
	// already embed their own copy with role-specific footer copy.
	const didUserWin = ctx.myWinning !== null;
	const showCreditPayoutForOther =
		isPartialParticipation(raffle) &&
		view.isConcluded &&
		!didUserWin &&
		!view.isOwner;
	return (
		<>
			<TerminalCards
				raffle={raffle}
				publicSlug={publicSlug}
				view={view}
				ctx={ctx}
			/>
			{showCreditPayoutForOther ? (
				<CreditPayoutCard raffle={raffle} viewer="other" />
			) : null}
			{view.showActiveCard ? (
				<ActiveCard
					raffle={raffle}
					view={view}
					ctx={ctx}
					xShareConfig={xShareConfig}
				/>
			) : null}
			{view.isConcluded && view.hasWinners && raffle.winners ? (
				<WinnersList
					winners={raffle.winners}
					raffleId={raffle.id}
					totalTickets={raffle.totalTicketsAtDraw}
					manifestHash={raffle.manifestHash}
					commitTxHash={raffle.commitTxHash}
					currentUserWinnerPosition={ctx.myWinning?.position ?? null}
				/>
			) : null}
			{!view.isConcluded ? (
				<RaffleInfoCard
					raffle={raffle}
					myTicketCodes={ctx.myTicketCodes}
					myTicketsTotal={ctx.myTicketsTotal}
					isAuthenticated={ctx.isAuthenticated}
					publicSlug={publicSlug}
				/>
			) : null}
		</>
	);
}

interface CardsProps {
	raffle: Raffle;
	publicSlug: string;
	view: RaffleViewState;
	ctx: RaffleUserContext;
}

/**
 * Mutually-exclusive terminal states: winner / host-fulfillment / cancelled
 * / not-won. Returns the first match or null — the branches don't overlap
 * by construction (see `deriveRaffleViewState`).
 */
function TerminalCards({ raffle, publicSlug, view, ctx }: CardsProps) {
	// Single null check on `ctx.myWinning` — the boolean alias is just for
	// the late-branch readability (`!didUserWin` reads better than
	// `ctx.myWinning === null` in the long expression below).
	const didUserWin = ctx.myWinning !== null;
	if (view.isConcluded && didUserWin) {
		return (
			<WinnerBlock
				raffle={raffle}
				publicSlug={publicSlug}
				view={view}
				ctx={ctx}
			/>
		);
	}
	if (view.showHostFulfillment) {
		return (
			<HostFulfillmentBlock
				raffle={raffle}
				publicSlug={publicSlug}
				view={view}
				ctx={ctx}
			/>
		);
	}
	if (view.showCancelledCard && view.cancellationReason) {
		return (
			<RaffleCancelledCard
				reason={view.cancellationReason}
				isOwner={view.isOwner}
				participantsCount={raffle.participantsCount}
				numberOfWinners={raffle.numberOfWinners}
				ticketsSoldCount={raffle.ticketsSoldCount}
				myTicketCount={ctx.myTicketsTotal}
			/>
		);
	}
	if (view.isConcluded && !didUserWin && !view.isOwner && view.hasWinners) {
		return (
			<RaffleNotWonCard
				status={raffle.status}
				publicSlug={publicSlug}
				myTicketsTotal={ctx.myTicketsTotal}
			/>
		);
	}
	return null;
}

/**
 * Winner-side composition: congrats card + prize breakdown + fulfillment
 * timeline. `kycWinnerStatus` feeds the timeline's claim gate — no KYC
 * means the user can't progress past the claim step.
 */
function WinnerBlock({ raffle, publicSlug, view, ctx }: CardsProps) {
	const myWinningTicketCode =
		ctx.myWinning?.position != null
			? (raffle.winners?.find(w => w.position === ctx.myWinning?.position)
					?.ticketCode ?? null)
			: null;
	if (!ctx.myWinning) return null;
	// Partial-participation raffles paid out as credits — the credit card
	// replaces the prize breakdown so the winner doesn't read a prize-value
	// figure that doesn't match the credits they actually received.
	const isCreditPayout = isPartialParticipation(raffle);
	return (
		<>
			<RaffleWonCard
				userName={ctx.myUserName ?? 'Winner'}
				userAvatar={ctx.myUserAvatarUrl}
				ticketCode={myWinningTicketCode}
			/>
			{isCreditPayout ? (
				<CreditPayoutCard raffle={raffle} viewer="winner" />
			) : (
				<PrizeBreakdownCard raffle={raffle} />
			)}
			<FulfillmentTimeline
				winning={ctx.myWinning}
				isHost={view.isOwner}
				raffleId={raffle.id}
				hostId={raffle.hostId}
				publicSlug={publicSlug}
				kycStatus={ctx.kycWinnerStatus}
			/>
		</>
	);
}

/** Host-side post-draw composition — fulfillment CTA + revenue + ticket list. */
function HostFulfillmentBlock({ raffle, publicSlug, ctx }: CardsProps) {
	// Partial-participation: the host kept no earnings (revenue went to
	// winners as credits). Surface the credit-payout breakdown in place of the
	// host-earnings card so the figures don't contradict each other.
	const isCreditPayout = isPartialParticipation(raffle);
	return (
		<>
			<HostFulfillmentCard
				publicSlug={publicSlug}
				winnersCount={raffle.winners?.length ?? 0}
			/>
			{isCreditPayout ? (
				<CreditPayoutCard raffle={raffle} viewer="host" />
			) : (
				<RevenueBreakdownCard raffle={raffle} />
			)}
			<RaffleInfoCard
				raffle={raffle}
				myTicketCodes={ctx.myTicketCodes}
				myTicketsTotal={ctx.myTicketsTotal}
				isAuthenticated={ctx.isAuthenticated}
				publicSlug={publicSlug}
			/>
		</>
	);
}

interface ActiveCardProps {
	raffle: Raffle;
	view: RaffleViewState;
	ctx: RaffleUserContext;
	xShareConfig: XShareConfig;
}

/**
 * Desktop "choose how to enter" panel — the redesigned active-raffle block
 * (status pill + countdown + entry stats + selectable subscription plan picker
 * + the one-time "add more entries" panel), plus share-on-X below. User-gated
 * because the share button is hidden for the host and blocked-purchase viewers.
 */
function ActiveCard({ raffle, view, ctx, xShareConfig }: ActiveCardProps) {
	const isPurchaseBlocked = view.showEditButton || view.disablePurchase;
	const showShareOnX = ctx.isAuthenticated && !isPurchaseBlocked;
	return (
		<div id="checkout-section" className="hidden h-fit flex-col gap-4 lg:flex">
			<ChooseEntryBlock
				endAt={raffle.endAt}
				entriesCount={raffle.ticketsSoldCount}
				price={view.ticketPrice}
				currency={raffle.ticketPriceCurrency}
				isSubscriber={ctx.subscription.isActive}
				isPastDue={ctx.subscription.isPastDue}
				subscriptionPlanName={ctx.subscription.planName}
				subscriptionDiscountPercent={ctx.subscription.discountPercent}
				availableCredits={ctx.availableCredits}
				sweepstakesName={raffle.title}
				publicSlug={raffle.publicSlugOrCode}
			/>
			{showShareOnX ? (
				<ShareOnXButton {...xShareConfig} myTicketsTotal={ctx.myTicketsTotal} />
			) : null}
		</div>
	);
}

// =============================================================================
// Left-column user slots — small async server components the page composes
// into `<RaffleLeftColumn>` slot props. Keeping runtime-data readers in this
// file per `.claude/rules/components.md`; the page wraps each in its own
// `<Suspense>` so these fetches don't block the left column's first paint.
// =============================================================================

interface TitleMetaAsyncProps {
	raffleId: string;
	hostId: string;
}

/** Participant badge + Report button — both gated on session identity. */
export async function RaffleTitleMetaAsync({
	raffleId,
	hostId,
}: TitleMetaAsyncProps) {
	const user = await getCurrentUser();
	if (!user) return null;
	// Host doesn't see the Participant badge or Report button on their own raffle.
	if (user.id === hostId) return null;
	const ticketCodesResponse = await getMyTicketCodes({ raffleId });
	const total = ticketCodesResponse.success
		? ticketCodesResponse.data.total
		: 0;
	return (
		<>
			{total > 0 ? (
				<span className="bg-brand-mint text-role-participant-fg text-mini rounded-lg px-6 py-1 font-semibold tracking-wide">
					Participant
				</span>
			) : null}
			<ReportRaffleButton raffleId={raffleId} />
		</>
	);
}

interface CommentSectionAsyncProps {
	raffleId: string;
	hostId: string;
}

/** User-aware comment section — hands session identity to the client widget. */
export async function RaffleCommentSectionAsync({
	raffleId,
	hostId,
}: CommentSectionAsyncProps) {
	const user = await getCurrentUser();
	return (
		<CommentSection
			raffleId={raffleId}
			isAuthenticated={user !== null}
			isOwner={user?.id === hostId}
			currentUserId={user?.id ?? null}
		/>
	);
}

interface MobilePurchaseAsyncProps {
	raffle: Raffle;
	view: RaffleViewState;
	/**
	 * Same X-share config the desktop ActiveCard receives — forwarded here so
	 * the AMOE / "Share on X" button renders inline on mobile too, in the
	 * scrollable page (not the sticky bar). The previous Figma pass intentionally
	 * dropped AMOE from the mobile surface; the current direction restores it
	 * so both breakpoints expose the free-entry path at the same hierarchy.
	 */
	xShareConfig: XShareConfig;
}

/**
 * Mobile active-raffle surface inside the left column hero. Renders the same
 * redesigned `ChooseEntryBlock` as the desktop sidebar (it is responsive on its
 * own) so both breakpoints share one entry design, then stacks the
 * KYC-if-you-win notice and the AMOE / X-share button below it.
 *
 * The X-share button uses the same `showShareOnX` gate as the desktop
 * `ActiveCard` so the free-entry CTA stays aligned across breakpoints.
 *
 * @returns The mobile active-raffle entry surface
 */
export async function RaffleMobilePurchaseAsync({
	raffle,
	view,
	xShareConfig,
}: MobilePurchaseAsyncProps) {
	const user = await getCurrentUser();
	const ctx = await buildUserContext(raffle, user, {
		shouldFetchKycStatus: view.shouldFetchKycStatus,
	});
	const isPurchaseBlocked = view.showEditButton || view.disablePurchase;
	const showShareOnX = ctx.isAuthenticated && !isPurchaseBlocked;
	return (
		<div className="flex flex-col gap-4 lg:hidden">
			<ChooseEntryBlock
				endAt={raffle.endAt}
				entriesCount={raffle.ticketsSoldCount}
				price={view.ticketPrice}
				currency={raffle.ticketPriceCurrency}
				isSubscriber={ctx.subscription.isActive}
				isPastDue={ctx.subscription.isPastDue}
				subscriptionPlanName={ctx.subscription.planName}
				subscriptionDiscountPercent={ctx.subscription.discountPercent}
				availableCredits={ctx.availableCredits}
				sweepstakesName={raffle.title}
				publicSlug={raffle.publicSlugOrCode}
			/>
			{view.showKycNotice ? (
				<div className="flex items-center gap-2">
					<InfoIcon className="text-ink-500 size-4 shrink-0" />
					<p className="text-ink-500 text-sm">
						You&apos;ll only need KYC if you win
					</p>
				</div>
			) : null}
			{showShareOnX ? (
				<ShareOnXButton {...xShareConfig} myTicketsTotal={ctx.myTicketsTotal} />
			) : null}
		</div>
	);
}
