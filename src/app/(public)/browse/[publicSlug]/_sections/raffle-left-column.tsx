import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { CollapsibleDescription } from '@/components/raffle/collapsible-description';
import { RaffleMediaGallery } from '@/components/raffle/media/media-gallery';
import { RaffleUpdatesCard } from '@/components/raffle/cards/updates-card';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { CopyRaffleLinkButton } from '@/components/browse/public-slug/copy-raffle-link-button';
import { PostUpdateButton } from '@/components/browse/public-slug/post-update-button';
import type { Category } from '@/types/category';
import type { Raffle } from '@/types/raffle';

interface RaffleLeftColumnProps {
	raffle: Raffle;
	publicSlug: string;
	categories: readonly Category[];
	isOwner: boolean;
	canManageUpdates: boolean;
	isCommentable: boolean;
	/**
	 * User-gated inline meta (Participant badge + Report button). Injected as
	 * a slot by the page so the server-rendered left column stays free of
	 * session reads — the slot is a `<Suspense>`-wrapped fragment fed from
	 * the async column file.
	 */
	titleMetaSlot: ReactNode;
	/** Mobile-only purchase card — user-gated Suspense slot from the page. */
	mobilePurchaseSlot: ReactNode;
	/** Comment section — only rendered when status is commentable. */
	commentSectionSlot: ReactNode;
}

/**
 * Resolves the raffle category's display name, falling back to "Other" when
 * the category is unknown (older cached raffles can carry a deleted categoryId).
 */
function resolveCategoryName(
	categories: readonly Category[],
	categoryId: string | undefined,
): string {
	if (!categoryId) return 'Other';
	return categories.find(c => c.id === categoryId)?.name || 'Other';
}

/** Resolves a host profile URL — prefers username, falls back to id. */
function buildHostProfileUrl(raffle: Raffle): string {
	const slugOrId = raffle.host?.username ?? raffle.host?.id ?? raffle.hostId;
	return `/host/${slugOrId}`;
}

/**
 * Left column of the public raffle page. Fully server-rendered and
 * user-agnostic so it can stream into the initial HTML without waiting on
 * the JWT decode in `<RaffleRightColumnAsync>`. User-gated meta (Participant
 * badge, Report button, comments, mobile purchase card) arrives via the
 * slot props below, each wrapped by the page in its own `<Suspense>`.
 *
 * @returns The non-user left-column server component
 */
export function RaffleLeftColumn({
	raffle,
	publicSlug,
	categories,
	isOwner,
	canManageUpdates,
	isCommentable,
	titleMetaSlot,
	mobilePurchaseSlot,
	commentSectionSlot,
}: RaffleLeftColumnProps) {
	const hostName = raffle.host?.name ?? 'Sweepstakes Host';
	const hostInitial = hostName.charAt(0);
	const hostRafflesCount = `${raffle.host?.totalRaffles ?? 0} Sweepstakes`;
	const hostAvatarUrl = raffle.host?.avatar ?? null;
	const categoryName = resolveCategoryName(categories, raffle.categoryId);
	const hostProfileUrl = buildHostProfileUrl(raffle);

	return (
		<div className="contents lg:col-start-1 lg:flex lg:flex-col lg:gap-8">
			<div className="order-1 flex w-full flex-col gap-4 rounded-3xl bg-white px-4 py-6 lg:gap-5 lg:overflow-hidden lg:p-8">
				<RaffleMediaGallery
					coverImage={raffle.coverMediaUrl}
					galleryImages={raffle.galleryMediaUrls}
					alt={raffle.title}
				/>

				<div className="flex flex-wrap items-center gap-3">
					<h2 className="font-clash-display lg:text-headline-md/tight text-body-md text-navy font-semibold tracking-tight">
						{raffle.title}
					</h2>
					{titleMetaSlot}
					<CopyRaffleLinkButton publicSlug={publicSlug} />
				</div>

				<Link
					href={hostProfileUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="group flex w-fit items-center gap-3"
				>
					<div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 font-semibold">
						{hostAvatarUrl ? (
							<Image
								src={hostAvatarUrl}
								alt={hostName}
								fill
								sizes="40px"
								className="object-cover"
							/>
						) : (
							hostInitial
						)}
					</div>
					<div className="flex min-w-0 flex-col text-sm">
						<span className="truncate group-hover:underline">
							by {hostName}
						</span>
						<span className="text-ink-500">{hostRafflesCount}</span>
					</div>
				</Link>

				<CollapsibleDescription
					content={raffle.description || ''}
					expandedSlot={
						<div className="flex flex-wrap gap-4 pt-2">
							<div className="bg-mint-100 rounded-2xl px-3 py-1">
								<span className="text-sm capitalize">{categoryName}</span>
							</div>
						</div>
					}
				/>

				{mobilePurchaseSlot}
			</div>

			<div className="order-3">
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

			{isCommentable ? (
				<div className="order-4">{commentSectionSlot}</div>
			) : null}

			<RaffleLeftColumnFaq />
		</div>
	);
}

/** Static FAQ accordion — pulled into its own function to keep JSX nesting shallow. */
function RaffleLeftColumnFaq() {
	return (
		<div className="order-5 flex w-full flex-col gap-5 rounded-3xl bg-white px-4 py-6 lg:overflow-hidden lg:p-8">
			<h3 className="font-clash-display text-navy text-2xl font-semibold">
				Have a question?
			</h3>
			<Accordion
				type="single"
				collapsible
				className="flex w-full flex-col gap-4"
			>
				<AccordionItem value="how-it-works" className="border-none">
					<AccordionTrigger className="rounded-2xl bg-sky-100 px-4 py-3 text-base font-semibold hover:no-underline lg:px-6 lg:py-4 lg:text-lg">
						How it works?
					</AccordionTrigger>
					<AccordionContent className="text-muted-foreground px-4 pt-4 text-justify text-sm hyphens-auto">
						A sweepstakes is a simple and fair way to win prizes. You can buy
						entries to improve your chances of winning — or enter for free via
						our{' '}
						<Link href="/free-entry" className="underline">
							no-purchase-necessary method
						</Link>
						. The winner will be randomly selected when the sweepstakes ends.
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="rules-eligibility" className="border-none">
					<AccordionTrigger className="rounded-2xl bg-sky-100 px-4 py-3 text-base font-semibold hover:no-underline lg:px-6 lg:py-4 lg:text-lg">
						Rules and eligibility
					</AccordionTrigger>
					<AccordionContent className="text-muted-foreground px-4 pt-4 text-justify text-sm hyphens-auto">
						Participants must be 18 years or older to enter. You can buy entries
						to improve your odds, or enter for free via our
						no-purchase-necessary method. Winners will be notified via email and
						must provide additional details to claim their prize. All sales are
						final and non-refundable.
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="partial-fulfillment" className="border-none">
					<AccordionTrigger className="rounded-2xl bg-sky-100 px-4 py-3 text-base font-semibold hover:no-underline lg:px-6 lg:py-4 lg:text-lg">
						What if a sweepstakes doesn&apos;t reach its minimums?
					</AccordionTrigger>
					<AccordionContent className="text-muted-foreground flex flex-col gap-3 px-4 pt-4 text-justify text-sm hyphens-auto">
						<p>
							A sweepstakes can set two minimums — a minimum number of unique
							participants and/or a minimum number of entries sold. If it ends
							before either threshold is met, it concludes under{' '}
							<strong>Partial Participation</strong>.
						</p>
						<p>
							Winners are still selected using the same provably fair process
							(VRF). Instead of the declared prize, each winner receives a share
							of the revenue as <strong>Rafli credits</strong>, added straight
							to their Rafli balance and usable on any future sweepstakes.
						</p>
						<p>
							The split is automatic: the platform keeps a 1% fee and the
							remaining 99% is divided equally among the winners. No host
							involvement is needed.
						</p>
						<p>
							You can always check the sweepstakes details to see the current
							participants and entries against the minimums required before
							entering.
						</p>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
