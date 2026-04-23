'use client';

import { Eye, Pencil, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';

import { EditRaffleButton } from '@/components/raffle/edit-raffle-button';
import { PublishSplitButton } from '@/components/raffle/publish-split-button';
import { RaffleShareButtons } from '@/components/raffle/share-buttons';
import { Button } from '@/components/ui/button';
import { ImageCarousel } from '@/components/ui-custom/image-carousel';
import { isAutoCancelled } from '@/lib/utils/raffle/cancellation-reason';
import { isEnrolledRaffle } from '@/lib/utils/raffle/raffle-guards';
import { cn } from '@/lib/class-names';
import { useUserStore } from '@/providers/user-store-provider';
import { activateRaffle } from '@/services/raffle/activate-raffle';
import { unpublishRaffle } from '@/services/raffle/unpublish-raffle';
import { usePublishRaffle } from '@/services/raffle/use-publish-raffle';
import { RAFFLE_STATUS, type MyRaffleItem } from '@/types/raffle';
import { USER_MODE } from '@/types/user-mode';

interface RaffleCardProps {
	raffle: MyRaffleItem;
}

interface CancelledBadge {
	label: string;
	className: string;
}

/**
 * Percentage of filled spots, clamped to 100. Unlimited raffles report 0
 * so the progress bar stays empty and the "Unlimited" label takes over
 * in the adjacent status span.
 *
 * @returns Fraction between 0 and 100.
 */
function calculateProgress(current: number, max: number): number {
	if (max === 0) return 0;
	return Math.min((current / max) * 100, 100);
}

/**
 * Auto-cancelled raffles (missed threshold, no tickets) render orange;
 * host-cancelled raffles render red to signal a deliberate withdrawal.
 *
 * @returns Badge config or null when the raffle is not cancelled.
 */
function getCancelledBadge(raffle: MyRaffleItem): CancelledBadge | null {
	if (raffle.status !== RAFFLE_STATUS.CANCELLED) return null;
	if (isAutoCancelled(raffle)) {
		return {
			label: 'Auto-Cancelled',
			className: 'bg-orange-50 text-orange-600',
		};
	}
	return {
		label: 'Cancelled',
		className: 'bg-red-50 text-red-600',
	};
}

/**
 * Money formatter shared by price and prize value — US-localized with up
 * to two decimals, dropped when the amount is an integer.
 *
 * @returns Formatted amount without currency symbol.
 */
function formatMoney(amount: string | number): string {
	return Number(amount).toLocaleString('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

/**
 * Formats the fill status — "Unlimited" for uncapped raffles, otherwise a
 * percentage with up to two decimals.
 */
function formatFillStatus(options: {
	isUnlimited: boolean;
	progress: number;
}): string {
	const { isUnlimited, progress } = options;
	if (isUnlimited) return 'Unlimited';
	return `${progress.toLocaleString('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})}% filled`;
}

/**
 * Participants label — only the current count for unlimited raffles,
 * otherwise `current/max`.
 */
function formatParticipants(options: {
	participantsCount: number;
	maxParticipants: number;
	isUnlimited: boolean;
}): string {
	const { participantsCount, maxParticipants, isUnlimited } = options;
	const formatter = new Intl.NumberFormat('en-US');
	if (isUnlimited) return formatter.format(participantsCount);
	return `${formatter.format(participantsCount)}/${formatter.format(maxParticipants)}`;
}

/**
 * RaffleCard — summary tile shown on the host's my-raffles dashboard.
 * Renders cover carousel, status badge, progress bar, and a mode-driven
 * action row (draft edit, queued go-live, or public-facing Details link).
 */
export function RaffleCard({ raffle }: RaffleCardProps) {
	const mode = useUserStore(state => state.mode);
	const isUnlimited = raffle.maxParticipants === 0;
	const progress = calculateProgress(
		raffle.participantsCount,
		raffle.maxParticipants,
	);
	// Progress-bar fill comes from a derived number — Tailwind cannot emit
	// the exact fractional width, so we hand off a variable reference.
	const progressFillStyle: CSSProperties = { width: `${progress}%` };
	const isHostMode = mode === USER_MODE.HOST;
	const showEditButton =
		mode !== null && isHostMode && raffle.status === RAFFLE_STATUS.DRAFT;
	const showQueuedActions =
		isHostMode && raffle.status === RAFFLE_STATUS.QUEUED;
	const cancelledBadge = getCancelledBadge(raffle);
	const isClickableCard = !showEditButton && !showQueuedActions;

	function renderCardActions() {
		if (showEditButton) return <DraftRaffleActions raffle={raffle} />;
		if (showQueuedActions) return <QueuedRaffleActions raffle={raffle} />;
		return (
			<Link
				href={`/browse/${raffle.publicSlugOrCode}`}
				className="relative z-10 mt-0 block"
			>
				<Button className="w-full cursor-pointer rounded-full border-2 border-black bg-black py-4 font-semibold text-white hover:bg-white hover:text-black">
					Details
				</Button>
			</Link>
		);
	}

	return (
		<div className="group relative flex max-w-70 min-w-70 flex-col overflow-hidden rounded-3xl border-2 border-transparent bg-white transition-colors duration-150 hover:border-black">
			<ImageCarousel
				coverImage={raffle.coverMediaUrl}
				galleryImages={raffle.galleryMediaUrls}
				alt={raffle.title}
				className="mb-4"
				sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
			/>

			<div className="flex flex-1 flex-col p-4">
				<h3 className="mb-2 h-16 text-xl font-bold tracking-tight text-gray-900">
					{isClickableCard ? (
						<Link
							href={`/browse/${raffle.publicSlugOrCode}`}
							className="line-clamp-2 after:absolute after:inset-0"
						>
							{raffle.title}
						</Link>
					) : (
						raffle.title
					)}
				</h3>

				{cancelledBadge ? (
					<span
						className={cn(
							'mb-2 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
							cancelledBadge.className,
						)}
					>
						{cancelledBadge.label}
					</span>
				) : null}

				<div className="mb-4 flex flex-col">
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground">Entry price</p>
						<p className="text-xl font-semibold">
							${formatMoney(raffle.ticketPriceAmount)}
						</p>
					</div>
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground">Prize value</p>
						<p className="text-xl font-semibold">
							${formatMoney(raffle.declaredValueAmount)}
						</p>
					</div>
					{isEnrolledRaffle(raffle) ? (
						<div className="flex items-center justify-between">
							<p className="text-muted-foreground">My Entries</p>
							<p className="text-xl font-semibold">{raffle.myTicketCount}</p>
						</div>
					) : null}
				</div>

				<div className="mb-2 flex items-center justify-between text-sm">
					<span className="text-ink-500">
						{formatParticipants({
							participantsCount: raffle.participantsCount,
							maxParticipants: raffle.maxParticipants,
							isUnlimited,
						})}
					</span>
					<span className="text-ink-500">
						{formatFillStatus({ isUnlimited, progress })}
					</span>
				</div>

				<div className="mb-6 h-2.75 w-full overflow-hidden rounded-full bg-gray-100">
					<div
						className="bg-primary h-full transition-all duration-300 ease-out"
						style={progressFillStyle}
					/>
				</div>

				{renderCardActions()}

				<div className="relative z-10">
					<RaffleShareButtons
						title={raffle.title}
						publicSlug={raffle.publicSlugOrCode}
					/>
				</div>
			</div>
		</div>
	);
}

/**
 * Draft-only actions (edit, preview, publish). Isolated so
 * `usePublishRaffle` is only mounted for draft cards.
 */
function DraftRaffleActions({ raffle }: { raffle: MyRaffleItem }) {
	const { isPublishing, handlePublish } = usePublishRaffle({
		raffleId: raffle.id,
		startAt: raffle.startAt,
	});

	return (
		<div className="mt-4 flex flex-col gap-2">
			<div className="flex gap-2">
				<EditRaffleButton publicSlug={raffle.publicSlugOrCode} />
				<Link href={`/browse/${raffle.publicSlugOrCode}`}>
					<Button
						variant="outline"
						className="cursor-pointer rounded-full border-2 border-black p-4 font-semibold transition-colors duration-150 hover:bg-black hover:text-white"
					>
						<Eye className="size-4" />
						Preview
					</Button>
				</Link>
			</div>
			<PublishSplitButton
				isPublishing={isPublishing}
				onPublish={handlePublish}
				className="w-full"
			/>
		</div>
	);
}

/**
 * Queued raffle actions — Edit (unpublish→draft then navigate) and Go
 * Live Now. Mirrors DraftRaffleActions layout so the CTA row alignment
 * is identical across statuses.
 */
function QueuedRaffleActions({ raffle }: { raffle: MyRaffleItem }) {
	const router = useRouter();
	// Tracks in-flight "Go Live Now" request to disable both buttons.
	const [isActivating, setIsActivating] = useState(false);
	// Tracks in-flight "Edit" (unpublish then navigate) request.
	const [isUnpublishing, setIsUnpublishing] = useState(false);

	// useCallback: stable reference passed as onClick — avoids re-render
	// of Button children when parent re-renders for unrelated reasons.
	const handleActivate = useCallback(async () => {
		setIsActivating(true);
		try {
			const result = await activateRaffle(raffle.id);
			if (!result.success) {
				toast.error('Failed to activate sweepstakes. Please try again.');
				return;
			}
			toast.success('Sweepstakes is now live!');
			// Server action already revalidated — refresh picks up the new status.
			router.refresh();
		} catch {
			toast.error('Something went wrong. Please try again.');
		} finally {
			setIsActivating(false);
		}
	}, [raffle.id, router]);

	// Backend requires the status to revert to draft before the update
	// endpoint accepts changes; unpublish then navigate.
	const handleEdit = useCallback(async () => {
		setIsUnpublishing(true);
		try {
			const result = await unpublishRaffle(raffle.id);
			if (!result.success) {
				toast.error('Failed to revert sweepstakes to draft. Please try again.');
				return;
			}
			router.push(`/my-raffles/${raffle.publicSlugOrCode}/edit`);
		} catch {
			toast.error('Something went wrong. Please try again.');
		} finally {
			setIsUnpublishing(false);
		}
	}, [raffle.id, raffle.publicSlugOrCode, router]);

	const isBusy = isActivating || isUnpublishing;

	return (
		<div className="mt-4 flex flex-col gap-2">
			<div className="flex gap-2">
				<Button
					onClick={handleEdit}
					disabled={isBusy}
					className="hover:bg-background flex flex-1 cursor-pointer items-center gap-2 border-2 border-black bg-black transition-colors duration-150 hover:text-black"
				>
					<Pencil className="size-4" />
					{isUnpublishing ? 'Reverting...' : 'Edit'}
				</Button>
				<Link href={`/browse/${raffle.publicSlugOrCode}`}>
					<Button
						variant="outline"
						disabled={isBusy}
						className="cursor-pointer rounded-full border-2 border-black p-4 font-semibold transition-colors duration-150 hover:bg-black hover:text-white"
					>
						<Eye className="size-4" />
						Preview
					</Button>
				</Link>
			</div>
			<Button
				onClick={handleActivate}
				disabled={isBusy}
				className="w-full cursor-pointer rounded-full border-2 border-black bg-black py-4 font-semibold text-white hover:bg-white hover:text-black"
			>
				<Zap className="size-4" />
				{isActivating ? 'Activating...' : 'Go Live Now'}
			</Button>
		</div>
	);
}
