import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Loading State for Host Profile Page
 *
 * Displays skeleton UI while the host profile and raffles are loading.
 */
export default function HostProfileLoading() {
	return (
		<div className="container mx-auto px-4 py-8">
			<Link href="/browse" className="mb-8 flex items-center gap-2">
				<ArrowLeft className="size-4" />
				<span className="font-semibold">Back to Raffle Browse</span>
			</Link>

			<div className="flex flex-col gap-8 lg:flex-row">
				{/* Sidebar Skeleton */}
				<aside className="w-full shrink-0 lg:w-80">
					<div className="flex flex-col overflow-hidden rounded-2xl bg-white p-6 lg:sticky lg:top-24">
						{/* Profile Image Skeleton */}
						<Skeleton className="mx-auto mb-4 size-24 rounded-full" />

						{/* Rating Skeleton */}
						<div className="mb-2 flex flex-col items-center gap-1">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-32" />
						</div>

						{/* Name Skeleton */}
						<Skeleton className="mx-auto mb-1 h-6 w-36" />

						{/* Raffles Count Skeleton */}
						<Skeleton className="mx-auto mb-4 h-4 w-24" />

						{/* Bio Skeleton */}
						<div className="border-t border-gray-100 pt-4">
							<Skeleton className="mb-2 h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					</div>
				</aside>

				{/* Main Content Skeleton */}
				<main className="flex-1">
					{/* Header Skeleton */}
					<div className="mb-6">
						<Skeleton className="mb-4 h-9 w-64" />
						<div className="flex gap-6 border-b border-gray-200 pb-3">
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-20" />
						</div>
					</div>

					{/* Grid Skeleton */}
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
						{Array.from({ length: 6 }).map((_, index) => (
							<RaffleCardSkeleton key={index} />
						))}
					</div>
				</main>
			</div>
		</div>
	);
}

/**
 * RaffleCardSkeleton Component
 *
 * Skeleton placeholder for a raffle card.
 */
function RaffleCardSkeleton() {
	return (
		<div className="flex w-full flex-col overflow-hidden rounded-[24px] bg-white">
			{/* Image Skeleton */}
			<Skeleton className="mb-4 aspect-square w-full rounded-none" />

			<div className="flex flex-1 flex-col p-4">
				{/* Title Skeleton */}
				<Skeleton className="mb-2 h-16 w-full" />

				{/* Price Info Skeleton */}
				<div className="mb-4 flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-6 w-16" />
					</div>
					<div className="flex items-center justify-between">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-6 w-16" />
					</div>
				</div>

				{/* Progress Skeleton */}
				<div className="mb-2 flex items-center justify-between">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-20" />
				</div>
				<Skeleton className="mb-6 h-[11px] w-full rounded-full" />

				{/* Button Skeleton */}
				<Skeleton className="h-12 w-full rounded-full" />
			</div>
		</div>
	);
}
