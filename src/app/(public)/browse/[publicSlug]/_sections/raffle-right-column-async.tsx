import { InfoIcon } from 'lucide-react';
import { Suspense } from 'react';

import { FulfillmentTimeline } from '@/components/fulfillment/timeline';
import { HostFulfillmentCard } from '@/components/fulfillment/host-card';
import { CreditPayoutCard } from '@/components/raffle/cards/credit-payout-card';
import { PrizeBreakdownCard } from '@/components/raffle/cards/prize-breakdown-card';
import { RaffleCancelledCard } from '@/components/raffle/cards/cancelled-card';
import { RaffleCountdown } from '@/components/raffle/countdown/countdown';
import { RaffleExpiredGate } from '@/components/raffle/expired-gate';
import { RaffleInfoCard } from '@/components/raffle/info-card/info-card';
import { RaffleNotWonCard } from '@/components/raffle/cards/not-won-card';
import { RaffleWonCard } from '@/components/raffle/cards/won-card';
import { RevenueBreakdownCard } from '@/components/raffle/cards/revenue-breakdown-card';
import { TicketPurchaseCard } from '@/components/raffle/ticket-purchase/ticket-purchase-card';
import { WinnersList } from '@/components/raffle/winners/winners-list';
import { CommentSection } from '@/components/raffle/comments/section';
import { ReportRaffleButton } from '@/components/browse/public-slug/report-raffle-button';
import { ShareOnXButton } from '@/components/browse/public-slug/share-on-x-button';
import { SubscribeUpsellCard } from '@/components/pricing/subscribe/subscribe-upsell-card';
import { getCurrentUser } from '@/lib/auth/session';
import { isPartialParticipation } from '@/lib/utils/raffle/partial-participation';
import { getMyTicketCodes } from '@/services/ticket/get-my-ticket-codes';
import type { Raffle } from '@/types/raffle';
import type { XShareConfig } from '@/components/browse/public-slug/x-share/use-share';

import { RaffleFireIcon } from './raffle-fire-icon';
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

/** Skeleton shown while the lazy crypto button bundle hydrates client-side. */
const TICKET_PURCHASE_CARD_FALLBACK = (
	<div className="bg-muted h-32 animate-pulse rounded-xl" />
);

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
					publicSlug={publicSlug}
					view={view}
					ctx={ctx}
					xShareConfig={xShareConfig}
				/>
			) : null}
			{/* Subscribe upsell — only when the viewer can actually buy entries
			    and isn't already subscribed. `view.showActiveCard` gates on
			    the raffle being mid-active (no point promoting discounts on a
			    concluded surface), `!view.isOwner` hides the card from the
			    host (they can't enter their own raffle so the discount is
			    moot), and `!ctx.subscription.isActive` covers both guests
			    (`EMPTY_CONTEXT` → inactive sentinel) and authenticated
			    non-subscribers per the Figma "show only if user is not
			    subscribed" annotation. */}
			{view.showActiveCard && !view.isOwner && !ctx.subscription.isActive ? (
				<SubscribeUpsellCard />
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
	publicSlug: string;
	view: RaffleViewState;
	ctx: RaffleUserContext;
	xShareConfig: XShareConfig;
}

/**
 * Desktop "sweepstakes is active!" panel — fire icon + heading + countdown
 * + purchase card + share-on-X. User-gated because the purchase card reads
 * credits/my-tickets and the share button is hidden for the host.
 */
function ActiveCard({
	raffle,
	publicSlug,
	view,
	ctx,
	xShareConfig,
}: ActiveCardProps) {
	const isPurchaseBlocked = view.showEditButton || view.disablePurchase;
	const showShareOnX = ctx.isAuthenticated && !isPurchaseBlocked;
	return (
		<div
			id="checkout-section"
			className="border-border bg-card/95 hidden h-fit rounded-2xl border p-8 lg:block"
		>
			<RaffleFireIcon className="mx-auto size-16" />
			<h2 className="font-clash-display my-4 text-center text-2xl font-semibold">
				The sweepstakes is active!
			</h2>
			<div className="mb-4">
				<RaffleCountdown endAt={raffle.endAt} />
			</div>
			<RaffleExpiredGate endAt={raffle.endAt}>
				<Suspense fallback={TICKET_PURCHASE_CARD_FALLBACK}>
					<ActivePurchaseCard
						raffle={raffle}
						publicSlug={publicSlug}
						view={view}
						ctx={ctx}
					/>
				</Suspense>
				{view.disablePurchase && !view.showEditButton ? (
					<p className="text-muted-foreground mt-2 text-center text-sm">
						You cannot enter your own sweepstakes
					</p>
				) : null}
			</RaffleExpiredGate>
			{showShareOnX ? (
				<ShareOnXButton {...xShareConfig} myTicketsTotal={ctx.myTicketsTotal} />
			) : null}
		</div>
	);
}

/** Shared purchase card render used by both desktop and mobile active surfaces. */
function ActivePurchaseCard({ raffle, publicSlug, view, ctx }: CardsProps) {
	const isPurchaseBlocked = view.showEditButton || view.disablePurchase;
	return (
		<TicketPurchaseCard
			raffleId={raffle.id}
			publicSlug={publicSlug}
			endAt={raffle.endAt}
			price={view.ticketPrice}
			currency={raffle.ticketPriceCurrency}
			availableTickets={view.availableTickets}
			disabled={isPurchaseBlocked}
			questionId={raffle.questionId}
			isAuthenticated={ctx.isAuthenticated}
			cryptoOptions={raffle.cryptoOptions}
			myTicketsTotal={ctx.myTicketsTotal}
			userId={ctx.currentUserId}
			availableCredits={ctx.availableCredits}
			raffleTitle={raffle.title}
			subscription={ctx.subscription}
		/>
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
	publicSlug: string;
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
 * Mobile-only purchase card inside the left column hero. Mirrors the desktop
 * active card but stacks the KYC-if-you-win notice below so the CTA stays
 * in reach on narrow viewports.
 *
 * Renders the AMOE / X-share button after the purchase card so mobile carries
 * the same regulatory free-entry CTA the desktop sidebar shows — matches the
 * `showShareOnX` gate used by `ActiveCard` to keep the surface decisions
 * aligned across breakpoints.
 */
export async function RaffleMobilePurchaseAsync({
	raffle,
	publicSlug,
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
		<div className="lg:hidden">
			<RaffleExpiredGate endAt={raffle.endAt}>
				<Suspense fallback={TICKET_PURCHASE_CARD_FALLBACK}>
					<ActivePurchaseCard
						raffle={raffle}
						publicSlug={publicSlug}
						view={view}
						ctx={ctx}
					/>
				</Suspense>
				{view.disablePurchase && !view.showEditButton ? (
					<p className="text-muted-foreground mt-2 text-center text-sm">
						You cannot enter your own sweepstakes
					</p>
				) : null}
			</RaffleExpiredGate>
			{view.showKycNotice ? (
				<div className="mt-4 flex items-center gap-2">
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
