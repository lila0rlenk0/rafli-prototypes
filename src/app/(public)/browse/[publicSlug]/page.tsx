import { CommentSection } from '@/components/raffle/comments/comment-section';
import { FulfillmentTimeline } from '@/components/fulfillment/fulfillment-timeline';
import { HostFulfillmentCard } from '@/components/fulfillment/host-fulfillment-card';
import { RaffleAutoRefresh } from '@/components/raffle/raffle-auto-refresh';
import { RaffleCancelledCard } from '@/components/raffle/raffle-cancelled-card';
import { RaffleCountdown } from '@/components/raffle/raffle-countdown';
import { RaffleExpiredGate } from '@/components/raffle/raffle-expired-gate';
import { RaffleDrawCard } from '@/components/raffle/raffle-draw-card';
import { PrizeBreakdownCard } from '@/components/raffle/prize-breakdown-card';
import { RaffleInfoCard } from '@/components/raffle/raffle-info-card';
import { RevenueBreakdownCard } from '@/components/raffle/revenue-breakdown-card';
import { RaffleNotWonCard } from '@/components/raffle/raffle-not-won-card';
import { RaffleShareButtons } from '@/components/raffle/raffle-share-buttons';
import { RaffleUpdatesCard } from '@/components/raffle/raffle-updates-card';
import { RaffleWonCard } from '@/components/raffle/raffle-won-card';
import { TicketPurchaseCard } from '@/components/raffle/ticket-purchase-card';
import { WinnersList } from '@/components/raffle/winners-list';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { BackLink } from '@/components/ui/back-link';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { CollapsibleDescription } from '@/components/raffle/collapsible-description';
import { getSession } from '@/lib/auth/session';
import { getCancellationReason } from '@/lib/utils/cancellation-reason';
import { getCategories } from '@/services/raffle/get-categories';
import { getRaffle } from '@/services/raffle/get-raffle';
import { getMyTicketCodes } from '@/services/ticket/get-my-ticket-codes';
import { getMe } from '@/services/user/get-me';
import { getMyWinnings } from '@/services/winning/get-my-winnings';
import type { Category } from '@/types/category';
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
import type { TicketCode } from '@/types/ticket';
import type { Winning } from '@/types/winning';
import { InfoIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, type ComponentProps } from 'react';
import { BugIcon } from '@/assets/icons/bug-icon';
import { PaymentModalWrapper } from './payment-modal-wrapper';
import { PostUpdateButton } from './post-update-button';
import { PromoCodesCard } from './promo-codes-card';
import { ReportRaffleButton } from './report-raffle-button';
import { StickyBuyTicketsCta } from './sticky-buy-tickets-cta';

interface PageProps {
	params: Promise<{
		publicSlug: string;
	}>;
	searchParams: Promise<{
		session_id?: string;
	}>;
}

/**
 * Raffle Detail Page
 *
 * Displays full details of a specific raffle including cover image, gallery,
 * description, and category. Allows authenticated users to purchase tickets.
 * Non-authenticated users can view all details but must sign in to purchase.
 *
 * Fetches data server-side using the getRaffle service.
 * Handles payment status modal after Stripe redirect.
 */
export default async function RafflePage({ params, searchParams }: PageProps) {
	const { publicSlug } = await params;

	/**
	 * Gets the category name from a list of categories by ID
	 *
	 * @param categories - List of available categories
	 * @param categoryId - The category ID to look up
	 * @returns The category name or 'Other' if not found
	 */
	function getCategoryName(
		categories: Category[],
		categoryId: string | undefined,
	): string {
		if (!categoryId) return 'Other';
		const category = categories.find(c => c.id === categoryId);
		return category?.name || 'Other';
	}

	// Step 1: Fetch raffle + categories in parallel.
	const [response, categoriesResponse] = await Promise.all([
		getRaffle(publicSlug),
		getCategories(),
	]);

	// Filter active categories only
	const categories = categoriesResponse.success
		? categoriesResponse.data.categories.filter(c => c.isActive)
		: [];

	if (!response.success) {
		return (
			<div className="flex h-[50vh] w-full flex-col items-center justify-center gap-10 text-center">
				<BugIcon />

				<hgroup className="space-y-4">
					<h2 className="text-xl font-semibold">Error loading raffle</h2>
					<p className="mt-2 text-lg">
						Something went wrong while trying to load the details for this
						raffle.
					</p>
				</hgroup>

				<Link
					href="/browse"
					className="rounded-full border border-black px-12 py-3 text-sm font-semibold text-black transition-colors"
				>
					Back to Browse
				</Link>
			</div>
		);
	}

	const raffle = response.data;

	// Step 2: Load session and user-specific data if authenticated.
	const session = await getSession();
	const isAuthenticated = !!session;
	const currentUserId = session?.user?.id ?? null;

	// Only fetch user's ticket codes if authenticated
	let myTicketCodes: TicketCode[] = [];
	let myTicketsTotal = 0;
	let myWinning: Winning | null = null;
	let myWinningTicketCode: string | null = null;
	let myUserName: string | null = null;
	let myUserAvatarUrl: string | null = null;

	if (isAuthenticated) {
		// Fetch user data in parallel to avoid waterfall
		const [ticketCodesResponse, winningsResponse, meResponse] =
			await Promise.all([
				getMyTicketCodes({ raffleId: raffle.id }),
				getMyWinnings(),
				getMe(),
			]);

		if (ticketCodesResponse.success) {
			myTicketCodes = ticketCodesResponse.data.tickets;
			myTicketsTotal = ticketCodesResponse.data.total;
		}

		if (winningsResponse.success) {
			myWinning =
				winningsResponse.data.winnings.find(
					winning => winning.raffleId === raffle.id,
				) ?? null;
		}

		// Get winning ticket code from raffle.winners if user won
		if (myWinning && raffle.winners) {
			const myWinnerEntry = raffle.winners.find(
				winner => winner.userId === currentUserId,
			);
			myWinningTicketCode = myWinnerEntry?.ticketCode ?? null;
		}

		if (meResponse.success) {
			myUserName = meResponse.data.name;
			myUserAvatarUrl = meResponse.data.avatarUrl;
		}
	}

	const didUserWin = !!myWinning;

	/**
	 * Check if raffle is concluded (ended, completed, or fulfilling)
	 */
	function isRaffleConcluded(): boolean {
		return CONCLUDED_STATUSES.includes(raffle.status as ConcludedStatus);
	}

	/**
	 * Check if current user owns this raffle
	 */
	function isOwnRaffle(): boolean {
		return currentUserId === raffle.hostId;
	}

	/**
	 * Check if edit button should be shown
	 * Only for own raffles with draft/queued status
	 */
	function shouldShowEditButton(): boolean {
		const isOwner = isOwnRaffle();
		const isEditable =
			raffle.status === RAFFLE_STATUS.DRAFT ||
			raffle.status === RAFFLE_STATUS.QUEUED;

		return isOwner && isEditable;
	}

	/**
	 * Check if purchase should be disabled
	 * Disabled for own live raffles
	 */
	function isPurchaseDisabled(): boolean {
		const isOwner = isOwnRaffle();
		const isLive = raffle.status === RAFFLE_STATUS.LIVE;

		return isOwner && isLive;
	}

	const showEditButton = shouldShowEditButton();
	const disablePurchase = isPurchaseDisabled();
	const isConcluded = isRaffleConcluded();
	const isOwner = isOwnRaffle();
	const hasWinners = (raffle.winners?.length ?? 0) > 0;
	const canManageUpdates = UPDATE_MANAGEABLE_STATUSES.includes(
		raffle.status as UpdateManageableStatus,
	);
	const isCommentable = COMMENTABLE_STATUSES.includes(
		raffle.status as CommentableStatus,
	);

	// Image URLs are now plain strings — no expiry checks needed
	const hostAvatarUrl = raffle.host?.avatar ?? null;

	/**
	 * Check if raffle status allows promo code management
	 */
	function isManageableStatus(): boolean {
		return PROMO_MANAGEABLE_STATUSES.includes(
			raffle.status as PromoManageableStatus,
		);
	}

	const isManageable = isManageableStatus();
	const isCancelled = raffle.status === RAFFLE_STATUS.CANCELLED;
	const cancellationReason = getCancellationReason(raffle);

	/**
	 * Whether the raffle concluded with partial participation (revenue share)
	 * Uses backend field when available, falls back to ticket count comparison
	 */
	const isPartialFulfillment =
		raffle.isPartialParticipation ??
		raffle.ticketsSoldCount < raffle.minParticipants;

	/**
	 * Checks if winner card should be shown (user won)
	 */
	function shouldShowWinnerCard(): boolean {
		return isConcluded && didUserWin && !!myWinning;
	}

	/**
	 * Checks if host fulfillment card should be shown
	 */
	function shouldShowHostFulfillment(): boolean {
		return isOwner && isConcluded && hasWinners && !didUserWin;
	}

	/**
	 * Checks if draw-in-progress card should be shown
	 * Only during `ended` status — VRF in flight, winners not yet assigned
	 * Intentionally excludes `fulfilling`/`completed` to avoid masking data inconsistencies
	 */
	function shouldShowDrawInProgress(): boolean {
		return raffle.status === RAFFLE_STATUS.ENDED && !hasWinners;
	}

	/**
	 * Checks if "not won" card should be shown
	 * Requires hasWinners so we don't show "not won" during VRF draw
	 */
	function shouldShowNotWonCard(): boolean {
		return isConcluded && !didUserWin && !isOwner && hasWinners;
	}

	/**
	 * Checks if cancelled card should be shown
	 */
	function shouldShowCancelledCard(): boolean {
		return isCancelled && !!cancellationReason;
	}

	/**
	 * Checks if active raffle card should be shown
	 * Excludes both concluded and cancelled raffles
	 */
	function shouldShowActiveCard(): boolean {
		return !isConcluded && !isCancelled;
	}

	/**
	 * Gets the host display name from closure
	 * Handles missing host data seamlessly
	 * @returns The host's name or default
	 */
	function getHostName(): string {
		if (!raffle.host || !raffle.host.name) return 'Raffle Host';

		return raffle.host.name;
	}

	/**
	 * Gets the first initial of the host's name from closure
	 * @returns The first character of the name or empty string
	 */
	function getHostInitial(): string {
		const name = getHostName();
		if (!name) return '';

		return name.charAt(0);
	}

	// TODO: The backend GET /raffles/{slug} endpoint intentionally excludes totalRaffles
	// from the host object for performance reasons. To display the correct count, either:
	// 1. Fetch host profile separately via getHostProfile(hostId)
	// 2. Request backend team to add totalRaffles to the HostInfo interface
	// See: raffles-core-backend/src/core/raffles/dto/raffle.dto.ts (HostInfo interface)
	/**
	 * Gets the formatted raffle count for the host from closure
	 * @returns Formatted string with label
	 */
	function getHostRafflesCount(): string {
		const count = raffle.host?.totalRaffles ?? 0;
		return `${count} Raffles`;
	}

	/** Builds the host profile URL from username, falls back to hostId */
	function getHostProfileUrl(): string {
		if (raffle.host?.username) return `/host/${raffle.host.username}`;
		return `/host/${raffle.host?.id ?? raffle.hostId}`;
	}

	/**
	 * Parses the ticket price from string to number
	 * @param priceString - Price as string from API
	 * @returns Parsed price as number
	 */
	function parseTicketPrice(priceString: string): number {
		return parseFloat(priceString);
	}

	/**
	 * Calculates the available tickets for purchase
	 * @param maxParticipants - Maximum number of participants
	 * @param participantsCount - Current number of participants
	 * @returns Number of available tickets
	 */
	function calculateAvailableTickets(
		maxParticipants: number,
		participantsCount: number,
	): number {
		return Math.max(0, maxParticipants - participantsCount);
	}

	// Step 3: Calculate derived values for render.
	const ticketPrice = parseTicketPrice(raffle.ticketPriceAmount);
	const availableTickets = calculateAvailableTickets(
		raffle.maxParticipants,
		raffle.participantsCount,
	);

	return (
		<div className="container mx-auto flex max-w-6xl flex-col gap-8 px-4">
			<BackLink fallbackHref="/browse" label="Back to Raffle Browse" />

			<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem] lg:gap-8">
				{/* Title + description card — mobile order 1, desktop left column */}
				<div className="order-1 flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-8 lg:col-start-1">
					<div className="flex items-start justify-between gap-2">
						<h2 className="text-3xl font-bold text-gray-900">{raffle.title}</h2>
						{isAuthenticated && !isOwner && (
							<ReportRaffleButton raffleId={raffle.id} />
						)}
					</div>

					<Link
						href={getHostProfileUrl()}
						target="_blank"
						rel="noopener noreferrer"
						className="group flex w-fit items-center gap-3"
					>
						<div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xl font-semibold">
							{hostAvatarUrl ? (
								<Image
									src={hostAvatarUrl}
									alt={getHostName()}
									fill
									sizes="48px"
									className="object-cover"
								/>
							) : (
								getHostInitial()
							)}
						</div>
						<div className="flex min-w-0 flex-col font-medium">
							<span className="truncate text-sm group-hover:underline">
								by {getHostName()}
							</span>
							<span className="text-xs">{getHostRafflesCount()}</span>
						</div>
					</Link>

					<ImageCarousel
						coverImage={raffle.coverMediaUrl}
						galleryImages={raffle.galleryMediaUrls}
						alt={raffle.title}
						aspectRatio="aspect-video"
						maxHeight="max-h-96"
						className="border border-[#E5E5E5]"
						sizes="(max-width: 1024px) 100vw, 736px"
						priority
					/>

					{raffle.galleryMediaUrls.length > 0 && (
						<div className="grid grid-cols-3 gap-4">
							{raffle.galleryMediaUrls.map((image, index) => (
								<div
									key={index}
									className="relative flex aspect-square max-h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white"
								>
									<Image
										src={image}
										alt={`Gallery ${index + 1}`}
										fill
										sizes="33vw"
										className="object-cover"
									/>
								</div>
							))}
						</div>
					)}

					<CollapsibleDescription content={raffle.description || ''} />

					<div className="flex flex-wrap gap-2">
						<div className="rounded-2xl bg-[#DFFFED] px-2 py-1">
							<span className="text-sm capitalize">
								{getCategoryName(categories, raffle.categoryId)}
							</span>
						</div>
					</div>
				</div>

				{/* Updates from host — mobile order 3, desktop left column */}
				<div className="order-3 lg:col-start-1">
					<RaffleUpdatesCard
						raffleId={raffle.id}
						hostName={raffle.host?.name ?? 'Host'}
						actionSlot={
							<PostUpdateButton
								publicSlug={publicSlug}
								isOwner={isOwner}
								canManageUpdates={canManageUpdates}
							/>
						}
					/>
				</div>

				{/* Comment section — mobile order 4, desktop left column */}
				{isCommentable && (
					<div className="order-4 lg:col-start-1">
						<CommentSection
							raffleId={raffle.id}
							isAuthenticated={isAuthenticated}
							isOwner={isOwner}
							currentUserId={currentUserId}
						/>
					</div>
				)}

				{/* FAQ — mobile order 5, desktop left column */}
				<div className="order-5 flex w-full flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6 lg:col-start-1">
					<h3 className="font-clash-display text-3xl font-semibold">
						Have a question?
					</h3>
					<Accordion type="single" collapsible className="w-full space-y-4">
						<AccordionItem value="how-it-works" className="border-none">
							<AccordionTrigger className="rounded-lg bg-[#E1F8FF] px-4 py-3 font-semibold hover:no-underline">
								How it works?
							</AccordionTrigger>
							<AccordionContent className="text-muted-foreground px-4 pt-4 text-sm">
								The raffle is a simple and fair way to win prizes. You can
								purchase tickets to increase your chances of winning. The winner
								will be randomly selected when the raffle ends.
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="rules-eligibility" className="border-none">
							<AccordionTrigger className="rounded-lg bg-[#E1F8FF] px-4 py-3 font-semibold hover:no-underline">
								Rules and Eligibility
							</AccordionTrigger>
							<AccordionContent className="text-muted-foreground px-4 pt-4 text-sm">
								Participants must be 18 years or older to enter. You can
								purchase multiple tickets to increase your chances of winning.
								Winners will be notified via email and must provide additional
								details to claim their prize. All sales are final and
								non-refundable.
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="partial-fulfillment" className="border-none">
							<AccordionTrigger className="rounded-lg bg-[#E1F8FF] px-4 py-3 font-semibold hover:no-underline">
								What if minimum participants aren&apos;t reached?
							</AccordionTrigger>
							<AccordionContent className="text-muted-foreground space-y-3 px-4 pt-4 text-sm">
								<p>
									Every raffle sets a minimum number of participants. If the
									raffle ends before reaching that minimum, it concludes under{' '}
									<strong>Partial Participation</strong>.
								</p>
								<p>
									When this happens, winners are still selected using the same
									provably fair process (VRF). However, instead of receiving the
									declared physical prize, winners receive a{' '}
									<strong>cash distribution</strong> from the revenue.
								</p>
								<p>
									The revenue is automatically split: the platform takes a small
									fee and the remainder is distributed equally among all
									winners. No host involvement is needed — the distribution
									happens automatically.
								</p>
								<p>
									You can always check the raffle details to see the current
									number of participants versus the minimum required before
									purchasing a ticket.
								</p>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>

				{/* Right sidebar — mobile order 2 (after title), desktop right column spanning all rows */}
				<div className="order-2 space-y-2 lg:col-start-2 lg:row-start-1 lg:row-end-[-1]">
					{shouldShowWinnerCard() && myWinning && (
						<>
							<RaffleWonCard
								userName={myUserName ?? 'Winner'}
								userAvatar={myUserAvatarUrl}
								ticketCode={myWinningTicketCode}
								isPartialFulfillment={isPartialFulfillment}
							/>
							<PrizeBreakdownCard
								raffle={raffle}
								isPartialParticipation={isPartialFulfillment}
								distributionAmount={myWinning?.distributionAmount}
							/>
							<FulfillmentTimeline
								winning={myWinning}
								isHost={isOwner}
								raffleId={raffle.id}
								hostId={raffle.hostId}
								publicSlug={publicSlug}
								isPartialFulfillment={isPartialFulfillment}
							/>
						</>
					)}

					{shouldShowHostFulfillment() && (
						<>
							<HostFulfillmentCard
								publicSlug={publicSlug}
								winnersCount={raffle.winners?.length ?? 0}
								isPartialFulfillment={isPartialFulfillment}
							/>
							<RevenueBreakdownCard
								raffle={raffle}
								isPartialParticipation={isPartialFulfillment}
							/>
							<RaffleInfoCard
								raffle={raffle}
								myTicketCodes={myTicketCodes}
								myTicketsTotal={myTicketsTotal}
								isAuthenticated={isAuthenticated}
							/>
						</>
					)}

					{shouldShowDrawInProgress() && <RaffleDrawCard />}

					{shouldShowCancelledCard() && (
						<RaffleCancelledCard
							reason={cancellationReason!}
							isOwner={isOwner}
							participantsCount={raffle.participantsCount}
							numberOfWinners={raffle.numberOfWinners}
							ticketsSoldCount={raffle.ticketsSoldCount}
							myTicketCount={myTicketsTotal}
						/>
					)}

					{shouldShowNotWonCard() && (
						<RaffleNotWonCard
							status={raffle.status}
							isPartialFulfillment={isPartialFulfillment}
						/>
					)}

					{shouldShowActiveCard() && (
						<div
							id="checkout-section"
							className="h-fit rounded-2xl border border-black bg-white p-8"
						>
							<RaffleFireIcon className="mx-auto size-12" />

							<h2 className="font-clash-display my-8 text-center text-xl font-semibold text-nowrap">
								The raffle is active!
							</h2>

							<RaffleCountdown endAt={raffle.endAt} />

							<RaffleExpiredGate endAt={raffle.endAt}>
								<Suspense
									fallback={
										<div className="h-32 animate-pulse rounded-xl bg-gray-100" />
									}
								>
									<TicketPurchaseCard
										raffleId={raffle.id}
										publicSlug={publicSlug}
										endAt={raffle.endAt}
										price={ticketPrice}
										currency={raffle.ticketPriceCurrency}
										availableTickets={availableTickets}
										disabled={showEditButton || disablePurchase}
										questionId={raffle.questionId}
										isAuthenticated={isAuthenticated}
										cryptoOptions={raffle.cryptoOptions}
										myTicketsTotal={myTicketsTotal}
										userId={currentUserId}
									/>
								</Suspense>

								{disablePurchase && !showEditButton && (
									<p className="mt-2 text-center text-sm text-gray-500">
										You cannot purchase tickets for your own raffle
									</p>
								)}
							</RaffleExpiredGate>

							<RaffleShareButtons
								title={raffle.title}
								publicSlug={raffle.publicSlugOrCode}
							/>
						</div>
					)}

					{isConcluded && hasWinners && raffle.winners && (
						<WinnersList
							winners={raffle.winners}
							raffleId={raffle.id}
							totalTickets={raffle.totalTicketsAtDraw}
							manifestHash={raffle.manifestHash}
							commitTxHash={raffle.commitTxHash}
							currentUserId={currentUserId}
						/>
					)}

					{!isConcluded && (
						<RaffleInfoCard
							raffle={raffle}
							myTicketCodes={myTicketCodes}
							myTicketsTotal={myTicketsTotal}
							isAuthenticated={isAuthenticated}
						/>
					)}

					<PromoCodesCard
						publicSlug={publicSlug}
						isOwner={isOwner}
						isManageable={isManageable}
					/>

					{!isConcluded && !isCancelled && (
						<div className="flex items-center justify-center gap-2">
							<InfoIcon className="size-4 text-[#7B7B7B]" />
							<p className="text-sm text-[#7B7B7B]">
								You&apos;ll only need to provide more details if you win
							</p>
						</div>
					)}

					{/* Auto-refresh during transitional states — self-disables via internal logic */}
					<RaffleAutoRefresh
						status={raffle.status}
						endAt={raffle.endAt}
						hasWinners={hasWinners}
					/>
				</div>
			</div>
			<PaymentModalWrapper
				publicSlug={publicSlug}
				searchParams={searchParams}
			/>

			{shouldShowActiveCard() && <StickyBuyTicketsCta />}
		</div>
	);
}

/**
 * RaffleFireIcon Component
 *
 * Decorative fire icon for the raffle active state.
 */
function RaffleFireIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="47"
			height="56"
			viewBox="0 0 47 56"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M4.375 32.0833C4.375 35.1458 5.06771 38.026 6.45313 40.724C7.83854 43.4219 9.77083 45.6702 12.25 47.4688C12.0556 46.8854 11.9098 46.29 11.8125 45.6823C11.7152 45.0746 11.6667 44.4792 11.6667 43.8958C11.6667 42.3402 11.9583 40.8819 12.5417 39.5208C13.125 38.1598 13.9756 36.9202 15.0938 35.8021L23.3333 27.7083L31.5729 35.8021C32.691 36.9202 33.5417 38.1598 34.125 39.5208C34.7083 40.8819 35 42.3402 35 43.8958C35 44.4792 34.9514 45.0746 34.8542 45.6823C34.7569 46.29 34.6111 46.8854 34.4167 47.4688C36.8958 45.6702 38.8281 43.4219 40.2135 40.724C41.599 38.026 42.2917 35.1458 42.2917 32.0833C42.2917 29.4583 41.7327 26.8941 40.6146 24.3906C39.4965 21.8871 37.8923 19.5902 35.8021 17.5C34.7812 18.2292 33.7119 18.8004 32.5938 19.2135C31.4756 19.6267 30.3577 19.8333 29.2396 19.8333C26.2744 19.8333 23.8194 18.8246 21.875 16.8073C19.9306 14.79 18.9583 12.25 18.9583 9.1875V7.72917C16.7223 9.33333 14.7048 11.1077 12.9062 13.0521C11.1077 14.9965 9.57644 17.026 8.3125 19.1406C7.04856 21.2552 6.07644 23.4184 5.39583 25.6302C4.71523 27.8421 4.375 29.9931 4.375 32.0833ZM23.3333 33.8333L18.1562 38.9375C17.4756 39.6181 16.9531 40.3715 16.5885 41.1979C16.224 42.0244 16.0417 42.9236 16.0417 43.8958C16.0417 45.8889 16.7465 47.5781 18.1562 48.9635C19.566 50.349 21.2917 51.0417 23.3333 51.0417C25.375 51.0417 27.1006 50.349 28.5104 48.9635C29.9202 47.5781 30.625 45.8889 30.625 43.8958C30.625 42.9236 30.4427 42.0244 30.0781 41.1979C29.7135 40.3715 29.191 39.6181 28.5104 38.9375L23.3333 33.8333ZM23.3333 0V9.625C23.3333 11.2777 23.9046 12.6631 25.0469 13.7813C26.1892 14.8994 27.5869 15.4583 29.2396 15.4583C30.1146 15.4583 30.9288 15.276 31.6823 14.9115C32.4358 14.5469 33.1042 14 33.6875 13.2708L35 11.6667C38.5973 13.7083 41.441 16.5521 43.5312 20.1979C45.6215 23.8438 46.6667 27.8056 46.6667 32.0833C46.6667 38.5973 44.4062 44.1146 39.8854 48.6354C35.3646 53.1563 29.8473 55.4167 23.3333 55.4167C16.8194 55.4167 11.3021 53.1563 6.78125 48.6354C2.26042 44.1146 0 38.5973 0 32.0833C0 25.8611 2.09027 19.8698 6.27083 14.1094C10.4514 8.34896 16.1389 3.64583 23.3333 0Z"
				fill="black"
			/>
		</svg>
	);
}
