'use client';

import { Eye, Pencil, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { EditRaffleButton } from '@/components/raffle/edit-raffle-button';
import { PublishSplitButton } from '@/components/raffle/publish-split-button';
import { RaffleShareButtons } from '@/components/raffle/raffle-share-buttons';
import { Button } from '@/components/ui/button';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { isAutoCancelled } from '@/lib/utils/cancellation-reason';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/providers/user-store-provider';
import { activateRaffle } from '@/services/raffle/activate-raffle';
import { unpublishRaffle } from '@/services/raffle/unpublish-raffle';
import { usePublishRaffle } from '@/services/raffle/use-publish-raffle';
import {
	isEnrolledRaffle,
	RAFFLE_STATUS,
	type MyRaffleItem,
} from '@/types/raffle';
import { USER_MODE } from '@/types/user-mode';

interface RaffleCardProps {
	raffle: MyRaffleItem;
}

/**
 * RaffleCard Component
 *
 * Displays a summary card for a raffle, including its cover image, status,
 * progress bar, and action buttons.
 */
export function RaffleCard({ raffle }: RaffleCardProps) {
	const mode = useUserStore(state => state.mode);

	const isUnlimited = raffle.maxParticipants === 0;

	/**
	 * Calculates the percentage of filled spots in a raffle
	 * @param current - Current number of participants
	 * @param max - Maximum number of participants
	 * @returns Percentage value between 0 and 100
	 */
	function calculateProgress(current: number, max: number): number {
		if (max === 0) return 0;
		return Math.min((current / max) * 100, 100);
	}

	/** Show edit button only for draft raffles in host mode (backend restricts updates to draft). */
	function shouldShowEditButton(): boolean {
		if (mode === null) {
			return false;
		}

		const isHostMode = mode === USER_MODE.HOST;
		return isHostMode && raffle.status === RAFFLE_STATUS.DRAFT;
	}

	const progress = calculateProgress(
		raffle.participantsCount,
		raffle.maxParticipants,
	);
	const showEditButton = shouldShowEditButton();
	const showQueuedActions =
		mode === USER_MODE.HOST && raffle.status === RAFFLE_STATUS.QUEUED;

	/**
	 * Gets cancellation badge label and color for cancelled raffles.
	 * Auto-cancelled → orange, host-cancelled → red.
	 * @returns Badge config or null if not cancelled
	 */
	function getCancelledBadge(): {
		label: string;
		className: string;
	} | null {
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

	const cancelledBadge = getCancelledBadge();

	/**
	 * Gets the fill status text
	 * @returns "Unlimited" for unlimited raffles, otherwise percentage
	 */
	function getFillStatus(): string {
		if (isUnlimited) return 'Unlimited';
		return `${progress.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		})}% filled`;
	}

	/**
	 * Gets the participants display text
	 * @returns Only current count for unlimited, otherwise "current/max"
	 */
	function getParticipantsDisplay(): string {
		const formatter = new Intl.NumberFormat('en-US');
		if (isUnlimited) {
			return formatter.format(raffle.participantsCount);
		}
		return `${formatter.format(raffle.participantsCount)}/${formatter.format(raffle.maxParticipants)}`;
	}

	function getTicketPrice() {
		const value = Number(raffle.ticketPriceAmount);
		return value.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	}

	function getPrizeValue() {
		const prizeValue = Number(raffle.declaredValueAmount);
		return prizeValue.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	}

	const isClickableCard = !showEditButton && !showQueuedActions;

	return (
		<div className="group relative flex max-w-70 min-w-70 flex-col overflow-hidden rounded-[24px] border-2 border-transparent bg-white transition-colors duration-150 hover:border-black">
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
						<p className="text-muted-foreground">Ticket prize</p>
						<p className="text-xl font-semibold">${getTicketPrice()}</p>
					</div>
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground">Prize value</p>
						<p className="text-xl font-semibold">${getPrizeValue()}</p>
					</div>
					{isEnrolledRaffle(raffle) ? (
						<div className="flex items-center justify-between">
							<p className="text-muted-foreground">My Tickets</p>
							<p className="text-xl font-semibold">{raffle.myTicketCount}</p>
						</div>
					) : null}
				</div>

				<div className="mb-2 flex items-center justify-between text-sm">
					<span className="text-[#7B7B7B]">{getParticipantsDisplay()}</span>
					<span className="text-[#7B7B7B]">{getFillStatus()}</span>
				</div>

				<div className="mb-6 h-[11px] w-full overflow-hidden rounded-full bg-gray-100">
					<div
						className="bg-primary h-full transition-all duration-300 ease-out"
						style={{ width: `${progress}%` }}
					/>
				</div>

				{showEditButton ? (
					<DraftRaffleActions raffle={raffle} />
				) : showQueuedActions ? (
					<QueuedRaffleActions raffle={raffle} />
				) : (
					<Link
						href={`/browse/${raffle.publicSlugOrCode}`}
						className="relative z-10 mt-0 block"
					>
						<Button className="w-full cursor-pointer rounded-full border-2 border-black bg-black py-4 font-semibold text-white hover:bg-white hover:text-black">
							Details
						</Button>
					</Link>
				)}

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
 * Draft-only actions (edit, preview, publish).
 * Isolated so usePublishRaffle hook is only mounted for draft cards.
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
						className="cursor-pointer rounded-full border-2 border-black px-4 py-4 font-semibold transition-colors duration-150 hover:bg-black hover:text-white"
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
 * Queued raffle actions — Edit (unpublish→draft then navigate) and Go Live Now.
 * Mirrors DraftRaffleActions layout: [Edit] [Preview] on top, action button below.
 */
function QueuedRaffleActions({ raffle }: { raffle: MyRaffleItem }) {
	const router = useRouter();
	const [isActivating, setIsActivating] = useState(false);
	const [isUnpublishing, setIsUnpublishing] = useState(false);

	const handleActivate = useCallback(async () => {
		setIsActivating(true);
		try {
			const result = await activateRaffle(raffle.id);
			if (!result.success) {
				toast.error('Failed to activate raffle. Please try again.');
				return;
			}
			toast.success('Raffle is now live!');
			// Server action already revalidated — refresh to pick up new status
			router.refresh();
		} catch {
			toast.error('Something went wrong. Please try again.');
		} finally {
			setIsActivating(false);
		}
	}, [raffle.id, router]);

	/**
	 * Unpublishes the raffle (queued→draft) then navigates to the edit page.
	 * The backend must revert to draft before the update endpoint accepts changes.
	 */
	const handleEdit = useCallback(async () => {
		setIsUnpublishing(true);
		try {
			const result = await unpublishRaffle(raffle.id);
			if (!result.success) {
				toast.error('Failed to revert raffle to draft. Please try again.');
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
						className="cursor-pointer rounded-full border-2 border-black px-4 py-4 font-semibold transition-colors duration-150 hover:bg-black hover:text-white"
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
