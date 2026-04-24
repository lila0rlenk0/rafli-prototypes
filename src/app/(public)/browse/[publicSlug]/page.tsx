import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { BugIcon } from '@/assets/icons/bug-icon';
import { MarqueeBanner } from '@/components/browse/marquee-banner';
import { MobileBackButton } from '@/components/browse/public-slug/mobile-back-button';
import { PaymentModalHost } from '@/components/browse/public-slug/payment-modal-host';
import { StickyBuyTicketsCta } from '@/components/browse/public-slug/sticky-buy-tickets-cta';
import { MobileCountdownBanner } from '@/components/raffle/countdown/mobile-countdown-banner';
import { BackLink } from '@/components/ui-custom/back-link';
import { PublicNavbar } from '@/components/ui-custom/public-navbar';
import { getCurrentUser } from '@/lib/auth/session';
import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { SERVER_ACTION_MAX_DURATION_SECONDS } from '@/lib/api/constants';
import { TicketQuantityStoreProvider } from '@/providers/ticket-quantity-store-provider';
import type { XShareConfig } from '@/components/browse/public-slug/x-share/use-share';

import { RaffleLeftColumn } from './_sections/raffle-left-column';
import { deriveRaffleViewState } from './_sections/raffle-page-derived';
import { loadRafflePage } from './_sections/raffle-page-loader';
import { RaffleRightColumn } from './_sections/raffle-right-column';
import {
	RaffleCommentSectionAsync,
	RaffleMobilePurchaseAsync,
	RaffleRightColumnAsync,
	RaffleTitleMetaAsync,
} from './_sections/raffle-right-column-async';

interface PageProps {
	params: Promise<{ publicSlug: string }>;
	searchParams: Promise<{ session_id?: string }>;
}

export const maxDuration = SERVER_ACTION_MAX_DURATION_SECONDS;

export default async function RafflePage({ params, searchParams }: PageProps) {
	const { publicSlug } = await params;
	const result = await loadRafflePage(publicSlug);

	if (result.status === 'not-found') notFound();
	if (result.status === 'error') return <RafflePageError />;

	const { raffle, categories } = result.data;
	const user = await getCurrentUser();
	const view = deriveRaffleViewState({
		read: result.data,
		currentUserId: user?.id ?? null,
	});
	const categoryName =
		categories.find(c => c.id === raffle.categoryId)?.name ?? 'Other';
	const xShareConfig: XShareConfig = {
		raffleId: raffle.id,
		title: raffle.title,
		publicSlug: raffle.publicSlugOrCode,
		xShareEnabled: raffle.xShareTicketsEnabled ?? false,
		xShareClaimStatus: raffle.xShareClaim?.status ?? null,
		questionId: raffle.questionId,
	};

	await trackAfter(
		RAFFLE_EVENTS.VIEWED,
		{
			raffle_id: raffle.id,
			raffle_slug: raffle.publicSlugOrCode,
			category: categoryName,
			status: raffle.status,
			ticket_price: raffle.ticketPriceAmount,
			host_id: raffle.hostId,
			participants_count: raffle.participantsCount,
			max_participants: raffle.maxParticipants,
			is_authenticated: user !== null,
		},
		{ userId: user?.id },
	);

	return (
		<PublicNavbar
			isAuthenticated={user !== null}
			topBanner={
				view.showShareMarquee ? (
					<MarqueeBanner message="Share this sweepstakes on X and get bonus entries!" />
				) : undefined
			}
		>
			<TicketQuantityStoreProvider>
				<div className="container mx-auto flex max-w-6xl flex-col gap-4 px-0 pt-0 pb-8 sm:py-8 lg:gap-8 lg:px-4">
					<MobileBackButton />
					<div className="hidden lg:block">
						<BackLink fallbackHref="/browse" label="Back to all sweepstakes" />
					</div>
					{view.showActiveCard ? (
						<>
							<MobileCountdownBanner endAt={raffle.endAt} />
							<div className="h-12 lg:hidden" />
						</>
					) : null}
					<div className="lg:grid-cols-sidebar grid w-full grid-cols-1 items-start gap-4 lg:gap-8">
						<RaffleLeftColumn
							raffle={raffle}
							publicSlug={publicSlug}
							categories={categories}
							isOwner={view.isOwner}
							canManageUpdates={view.canManageUpdates}
							isCommentable={view.isCommentable}
							titleMetaSlot={
								<Suspense fallback={null}>
									<RaffleTitleMetaAsync
										raffleId={raffle.id}
										hostId={raffle.hostId}
									/>
								</Suspense>
							}
							mobilePurchaseSlot={
								view.showActiveCard ? (
									<Suspense fallback={null}>
										<RaffleMobilePurchaseAsync
											raffle={raffle}
											publicSlug={publicSlug}
											view={view}
										/>
									</Suspense>
								) : null
							}
							commentSectionSlot={
								<Suspense fallback={null}>
									<RaffleCommentSectionAsync
										raffleId={raffle.id}
										hostId={raffle.hostId}
									/>
								</Suspense>
							}
						/>
						<RaffleRightColumn
							raffle={raffle}
							publicSlug={publicSlug}
							view={view}
							userAsyncSlot={
								<Suspense fallback={null}>
									<RaffleRightColumnAsync
										raffle={raffle}
										publicSlug={publicSlug}
										view={view}
										xShareConfig={xShareConfig}
									/>
								</Suspense>
							}
						/>
					</div>
					<PaymentModalHost
						publicSlug={publicSlug}
						searchParams={searchParams}
					/>
					{view.showActiveCard ? (
						<StickyBuyTicketsCta
							{...xShareConfig}
							isAuthenticated={user !== null}
							availableTickets={view.availableTickets}
							disabled={view.showEditButton || view.disablePurchase}
							price={view.ticketPrice}
							currency={raffle.ticketPriceCurrency}
						/>
					) : null}
				</div>
			</TicketQuantityStoreProvider>
		</PublicNavbar>
	);
}

function RafflePageError() {
	return (
		<div className="h-half-screen flex w-full flex-col items-center justify-center gap-10 text-center">
			<BugIcon />
			<hgroup className="flex flex-col gap-4">
				<h2 className="text-xl font-semibold">Error loading sweepstakes</h2>
				<p className="mt-2 text-lg">
					Something went wrong while trying to load the details for this
					sweepstakes.
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
